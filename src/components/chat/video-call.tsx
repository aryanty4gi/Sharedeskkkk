import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { type Profile, createCall, updateCall } from "@/lib/chat/queries";

type CallStatus = "idle" | "calling" | "ringing" | "connected" | "ended";

const iceServers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function VideoCall({
  conversationId,
  userId,
  other,
  activeCall,
  setActiveCall,
}: {
  conversationId: string;
  userId: string;
  other: Profile;
  activeCall: boolean;
  setActiveCall: (active: boolean) => void;
}) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [answeredAtTime, setAnsweredAtTime] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const channelRef = useRef<any>(null);

  // 30 seconds call timeout
  useEffect(() => {
    if (status === "calling" && currentCallId) {
      const timer = setTimeout(() => {
        toast.info("No answer");
        void updateCall(currentCallId, {
          status: "missed",
          ended_at: new Date().toISOString(),
        });
        endCall(true, true);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [status, currentCallId]);

  // Initialize signaling channel
  useEffect(() => {
    const channelName = `signaling:${conversationId}`;
    const ch = supabase.channel(channelName);

    ch.on("broadcast", { event: "invite" }, (payload: any) => {
      if (payload.payload.from !== userId) {
        setCurrentCallId(payload.payload.callId);
        setStatus("ringing");
        setActiveCall(true);
      }
    })
      .on("broadcast", { event: "accept" }, async (payload: any) => {
        if (payload.payload.from !== userId && status === "calling") {
          const ansAt = payload.payload.answeredAt || new Date().toISOString();
          setAnsweredAtTime(ansAt);
          setStatus("connected");
          await startConnection(true);
        }
      })
      .on("broadcast", { event: "decline" }, (payload: any) => {
        if (payload.payload.from !== userId) {
          toast.info("Call declined by recipient");
          endCall(false, true);
        }
      })
      .on("broadcast", { event: "hangup" }, (payload: any) => {
        if (payload.payload.from !== userId) {
          toast.info("Call ended");
          endCall(false, true);
        }
      })
      .on("broadcast", { event: "webrtc" }, async (payload: any) => {
        if (payload.payload.from === userId) return;

        const { type, sdp, candidate } = payload.payload;
        const pc = pcRef.current;

        if (type === "offer" && pc) {
          await pc.setRemoteDescription(new RTCSessionDescription({ type, sdp }));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ch.send({
            type: "broadcast",
            event: "webrtc",
            payload: { type: "answer", sdp: answer.sdp, from: userId },
          });
        } else if (type === "answer" && pc) {
          await pc.setRemoteDescription(new RTCSessionDescription({ type, sdp }));
        } else if (type === "candidate" && pc && candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error("Error adding ice candidate", e);
          }
        }
      })
      .subscribe();

    channelRef.current = ch;

    return () => {
      supabase.removeChannel(ch);
      // Ensure clean closure of streams/connections on unmount
      if (pcRef.current) pcRef.current.close();
    };
  }, [conversationId, userId, status, currentCallId, answeredAtTime]);

  // Set local video stream elements when localStream changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Set remote video stream elements when remoteStream changes
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const startCall = async () => {
    const callId = crypto.randomUUID();
    setCurrentCallId(callId);
    setStatus("calling");
    setActiveCall(true);

    void createCall(callId, conversationId, userId, other.id, "video");

    channelRef.current?.send({
      type: "broadcast",
      event: "invite",
      payload: { from: userId, callId, callType: "video" },
    });
  };

  const acceptCall = async () => {
    setStatus("connected");
    const nowStr = new Date().toISOString();
    setAnsweredAtTime(nowStr);

    channelRef.current?.send({
      type: "broadcast",
      event: "accept",
      payload: { from: userId, answeredAt: nowStr },
    });

    if (currentCallId) {
      void updateCall(currentCallId, {
        status: "connected",
        answered_at: nowStr,
      });
    }
    await startConnection(false);
  };

  const declineCall = () => {
    channelRef.current?.send({
      type: "broadcast",
      event: "decline",
      payload: { from: userId },
    });
    if (currentCallId) {
      void updateCall(currentCallId, {
        status: "declined",
        ended_at: new Date().toISOString(),
      });
    }
    endCall(false, true);
  };

  const startConnection = async (isInitiator: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);

      const pc = new RTCPeerConnection(iceServers);
      pcRef.current = pc;

      // Add local stream tracks to WebRTC connection
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Handle incoming remote track
      const remoteMediaStream = new MediaStream();
      setRemoteStream(remoteMediaStream);

      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteMediaStream.addTrack(track);
        });
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          channelRef.current?.send({
            type: "broadcast",
            event: "webrtc",
            payload: {
              type: "candidate",
              candidate: event.candidate,
              from: userId,
            },
          });
        }
      };

      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        channelRef.current?.send({
          type: "broadcast",
          event: "webrtc",
          payload: { type: "offer", sdp: offer.sdp, from: userId },
        });
      }
    } catch (err) {
      console.error("Failed to access media devices:", err);
      toast.error("Could not access your camera or microphone.");
      endCall(true);
    }
  };

  const endCall = (notify: boolean, skipDbUpdate = false) => {
    if (notify) {
      channelRef.current?.send({
        type: "broadcast",
        event: "hangup",
        payload: { from: userId },
      });
    }

    if (currentCallId && !skipDbUpdate) {
      const nowStr = new Date().toISOString();
      let finalStatus: "completed" | "missed" | "declined" | "cancelled" | "failed" = "completed";
      let elapsedSeconds = null;

      if (status === "calling") {
        finalStatus = "cancelled";
      } else if (status === "ringing") {
        finalStatus = "declined";
      } else if (status === "connected") {
        finalStatus = "completed";
        if (answeredAtTime) {
          elapsedSeconds = Math.max(0, Math.floor((new Date(nowStr).getTime() - new Date(answeredAtTime).getTime()) / 1000));
        }
      }

      void updateCall(currentCallId, {
        status: finalStatus,
        ended_at: nowStr,
        duration_seconds: elapsedSeconds,
      });
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    setStatus("idle");
    setActiveCall(false);
    setCurrentCallId(null);
    setAnsweredAtTime(null);
  };

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !micEnabled;
      });
      setMicEnabled(!micEnabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !videoEnabled;
      });
      setVideoEnabled(!videoEnabled);
    }
  };

  if (!activeCall) {
    return (
      <Button
        size="icon"
        variant="ghost"
        onClick={startCall}
        className="rounded-full text-muted-foreground hover:text-[#3B6FA0]"
        title="Start Video Meeting"
      >
        <Phone className="size-4" />
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl aspect-video rounded-3xl bg-zinc-900 overflow-hidden shadow-2xl border border-zinc-800 flex flex-col justify-between">
        
        {/* Remote Video Stream (Main view) */}
        <div className="absolute inset-0 flex items-center justify-center">
          {status === "connected" && remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center text-zinc-400">
              <Loader2 className="size-8 animate-spin mx-auto mb-4 text-[#3B6FA0]" />
              <p className="text-sm font-medium">
                {status === "calling" && `Calling ${other.full_name || other.email}...`}
                {status === "ringing" && `Incoming call from ${other.full_name || other.email}...`}
                {status === "connected" && "Connecting media stream..."}
              </p>
            </div>
          )}
        </div>

        {/* Local Video Stream (Picture-in-picture) */}
        {localStream && (
          <div className="absolute top-4 right-4 w-44 aspect-video rounded-xl overflow-hidden border-2 border-white/20 shadow-lg z-10">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
          </div>
        )}

        {/* Ringing Overlay Dialog */}
        {status === "ringing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-20">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-sm text-center shadow-2xl">
              <p className="text-lg font-semibold text-zinc-100 mb-2">Incoming Call</p>
              <p className="text-sm text-zinc-400 mb-6">{other.full_name || other.email}</p>
              <div className="flex justify-center gap-4">
                <Button onClick={acceptCall} className="bg-emerald-600 hover:bg-emerald-700 rounded-xl px-6">
                  <Phone className="mr-2 size-4" /> Accept
                </Button>
                <Button onClick={declineCall} variant="destructive" className="rounded-xl px-6">
                  <PhoneOff className="mr-2 size-4" /> Decline
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Header details */}
        <div className="relative z-10 p-6 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between text-white pointer-events-none">
          <div>
            <p className="text-base font-semibold">{other.full_name || other.email}</p>
            <p className="text-xs text-zinc-400 capitalize">{status} call</p>
          </div>
        </div>

        {/* Bottom Control Actions */}
        <div className="relative z-10 p-6 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center gap-4">
          {status === "connected" && (
            <>
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleMic}
                className={`rounded-full size-12 bg-zinc-800/80 hover:bg-zinc-700/80 text-white ${!micEnabled && "bg-red-600 hover:bg-red-700"}`}
              >
                {micEnabled ? <Mic className="size-5" /> : <MicOff className="size-5" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleVideo}
                className={`rounded-full size-12 bg-zinc-800/80 hover:bg-zinc-700/80 text-white ${!videoEnabled && "bg-red-600 hover:bg-red-700"}`}
              >
                {videoEnabled ? <Video className="size-5" /> : <VideoOff className="size-5" />}
              </Button>
            </>
          )}
          <Button
            size="icon"
            variant="destructive"
            onClick={() => endCall(true)}
            className="rounded-full size-12 shadow-lg"
          >
            <PhoneOff className="size-5" />
          </Button>
        </div>

      </div>
    </div>
  );
}
