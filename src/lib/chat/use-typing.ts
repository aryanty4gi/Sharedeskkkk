import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Broadcast-based typing indicator scoped to a conversation.
 * Returns [otherIsTyping, notifyTyping].
 */
export function useTyping(conversationId: string | null, userId: string | null) {
  const [otherTyping, setOtherTyping] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const clearTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!conversationId || !userId) return;
    const ch = supabase.channel(`typing:${conversationId}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "typing" }, (payload) => {
      if (payload.payload?.user_id === userId) return;
      setOtherTyping(true);
      if (clearTimer.current) window.clearTimeout(clearTimer.current);
      clearTimer.current = window.setTimeout(() => setOtherTyping(false), 2500);
    });
    ch.subscribe();
    channelRef.current = ch;
    return () => {
      if (clearTimer.current) window.clearTimeout(clearTimer.current);
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [conversationId, userId]);

  const lastSent = useRef(0);
  const notifyTyping = () => {
    if (!channelRef.current || !userId) return;
    const now = Date.now();
    if (now - lastSent.current < 1200) return;
    lastSent.current = now;
    channelRef.current.send({ type: "broadcast", event: "typing", payload: { user_id: userId } });
  };

  return { otherTyping, notifyTyping };
}
