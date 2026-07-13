import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchMessages, editMessage, deleteMessage, markRead,
  fetchReactionsForConversation, toggleReaction,
  fetchStarredIds, toggleStar,
  type Message, type Profile, type Reaction,
} from "@/lib/chat/queries";
import { formatLastSeen } from "@/lib/chat/format";
import { useTyping } from "@/lib/chat/use-typing";
import { UserAvatar } from "./user-avatar";
import { MessageBubble, TypingBubble } from "./message-bubble";
import { MessageComposer } from "./message-composer";
import { ForwardDialog } from "./forward-dialog";
import { VideoCall } from "./video-call";
import { CheckCheck } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { differenceInMinutes, format } from "date-fns";

type Read = { message_id: string; user_id: string; read_at: string };

export function ChatWindow({
  conversationId, userId, other,
}: { conversationId: string; userId: string; other: Profile }) {
  const qc = useQueryClient();
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [forwardTarget, setForwardTarget] = useState<Message | null>(null);
  const [activeCall, setActiveCall] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => fetchMessages(conversationId),
  });

  const { data: reads = [] } = useQuery({
    queryKey: ["reads", conversationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("message_reads")
        .select("message_id, user_id, read_at")
        .eq("user_id", other.id);
      return (data ?? []) as Read[];
    },
  });

  const { data: reactions = [] } = useQuery({
    queryKey: ["reactions", conversationId],
    queryFn: () => fetchReactionsForConversation(conversationId),
  });

  const { data: starred = new Set<string>() } = useQuery({
    queryKey: ["starred", userId],
    queryFn: () => fetchStarredIds(userId),
  });

  const { otherTyping, notifyTyping } = useTyping(conversationId, userId);

  const senderMap = useMemo(() => {
    const m = new Map<string, Profile>();
    m.set(other.id, other);
    return m;
  }, [other]);

  const msgById = useMemo(() => {
    const m = new Map<string, Message>();
    for (const x of messages) m.set(x.id, x);
    return m;
  }, [messages]);

  const readSet = useMemo(() => new Set(reads.map((r) => r.message_id)), [reads]);

  const reactionsByMsg = useMemo(() => {
    const m = new Map<string, Reaction[]>();
    for (const r of reactions) {
      const arr = m.get(r.message_id) ?? [];
      arr.push(r);
      m.set(r.message_id, arr);
    }
    return m;
  }, [reactions]);

  // Last own message the other user has read → used to render "Seen HH:mm".
  const lastSeen = useMemo(() => {
    const readMap = new Map(reads.map((r) => [r.message_id, r.read_at] as const));
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.sender_id !== userId) continue;
      const readAt = readMap.get(m.id);
      if (readAt) return { messageId: m.id, readAt };
    }
    return null;
  }, [messages, reads, userId]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["messages", conversationId] });
          qc.invalidateQueries({ queryKey: ["conversations"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_reads" },
        () => qc.invalidateQueries({ queryKey: ["reads", conversationId] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        () => qc.invalidateQueries({ queryKey: ["reactions", conversationId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [conversationId, qc]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, otherTyping]);

  useEffect(() => {
    const unread = messages.filter((m) => m.sender_id !== userId).map((m) => m.id);
    if (unread.length === 0) return;
    markRead(unread, userId).then(() => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    });
  }, [messages, userId, qc]);

  const handleEdit = async (id: string, content: string) => {
    try { await editMessage(id, content); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed to edit"); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteMessage(id); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed to delete"); }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    try {
      await toggleReaction(messageId, userId, emoji);
      qc.invalidateQueries({ queryKey: ["reactions", conversationId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to react");
    }
  };

  const handleStar = async (messageId: string) => {
    try {
      await toggleStar(messageId, userId);
      qc.invalidateQueries({ queryKey: ["starred", userId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };


  const rendered = useMemo(() => {
    const out: Array<{ type: "date"; date: string } | { type: "msg"; m: Message; showAvatar: boolean }> = [];
    let lastDate = "";
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const dateKey = format(new Date(m.created_at), "yyyy-MM-dd");
      if (dateKey !== lastDate) {
        out.push({ type: "date", date: m.created_at });
        lastDate = dateKey;
      }
      const next = messages[i + 1];
      const isLastOfGroup = !next
        || next.sender_id !== m.sender_id
        || differenceInMinutes(new Date(next.created_at), new Date(m.created_at)) > 3;
      out.push({ type: "msg", m, showAvatar: isLastOfGroup });
    }
    return out;
  }, [messages]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <UserAvatar profile={other} size="lg" showStatus />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{other.full_name || other.email}</div>
          <div className="text-xs text-muted-foreground">
            {[other.designation, other.department].filter(Boolean).join(" · ")}
            {(other.designation || other.department) && " · "}
            <span className={other.is_online ? "text-emerald-600" : ""}>
              {formatLastSeen(other.is_online ? "" : other.last_seen, other.is_online)}
            </span>
          </div>
        </div>
        <VideoCall
          conversationId={conversationId}
          userId={userId}
          other={other}
          activeCall={activeCall}
          setActiveCall={setActiveCall}
        />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 sm:px-6">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <UserAvatar profile={other} size="xl" />
            <p className="mt-4 text-sm font-medium">{other.full_name || other.email}</p>
            <p className="mt-1 text-xs text-muted-foreground">Say hello to start the conversation.</p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-1.5">
            <AnimatePresence initial={false}>
              {rendered.map((item, i) => {
                if (item.type === "date") {
                  return (
                    <div key={`d-${i}`} className="my-3 flex items-center gap-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                        {format(new Date(item.date), "EEEE, MMM d")}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  );
                }
                const m = item.m;
                const isMine = m.sender_id === userId;
                const replySource = m.reply_to ? msgById.get(m.reply_to) ?? null : null;
                return (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    isMine={isMine}
                    sender={isMine ? undefined : other}
                    showAvatar={item.showAvatar && !isMine}
                    isRead={isMine ? readSet.has(m.id) : false}
                    isStarred={starred.has(m.id)}
                    reactions={reactionsByMsg.get(m.id) ?? []}
                    currentUserId={userId}
                    onReply={() => setReplyTo(m)}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onStar={() => handleStar(m.id)}
                    onForward={() => setForwardTarget(m)}
                    onReact={(emoji) => handleReact(m.id, emoji)}
                    replySource={replySource}
                  />
                );
              })}
              {lastSeen && !otherTyping && (
                <motion.div
                  key={`seen-${lastSeen.messageId}`}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-0.5 flex items-center justify-end gap-1 pr-1 text-[10px] text-muted-foreground"
                >
                  <CheckCheck className="size-3 text-sky-500" />
                  <span>Seen {format(new Date(lastSeen.readAt), "HH:mm")}</span>
                </motion.div>
              )}
              {otherTyping && (
                <motion.div key="typing-wrapper" layout>
                  <TypingBubble sender={other} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <MessageComposer
        conversationId={conversationId}
        senderId={userId}
        onTyping={notifyTyping}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        senderMap={senderMap}
      />

      <ForwardDialog
        open={!!forwardTarget}
        onOpenChange={(v) => !v && setForwardTarget(null)}
        message={forwardTarget}
        currentUserId={userId}
      />
    </div>
  );
}
