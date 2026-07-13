import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Listens to typing broadcasts across many conversations at once.
 * Returns a Set of conversation IDs where the *other* participant is currently typing.
 */
export function useMultiTyping(conversationIds: string[], selfUserId: string | null) {
  const [typingSet, setTypingSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!selfUserId || conversationIds.length === 0) return;

    const timers = new Map<string, number>();
    const channels = conversationIds.map((cid) => {
      const ch = supabase.channel(`typing:${cid}`, { config: { broadcast: { self: false } } });
      ch.on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.user_id === selfUserId) return;
        setTypingSet((prev) => {
          if (prev.has(cid)) return prev;
          const next = new Set(prev);
          next.add(cid);
          return next;
        });
        const existing = timers.get(cid);
        if (existing) window.clearTimeout(existing);
        timers.set(
          cid,
          window.setTimeout(() => {
            setTypingSet((prev) => {
              if (!prev.has(cid)) return prev;
              const next = new Set(prev);
              next.delete(cid);
              return next;
            });
            timers.delete(cid);
          }, 2500),
        );
      });
      ch.subscribe();
      return ch;
    });

    return () => {
      for (const t of timers.values()) window.clearTimeout(t);
      timers.clear();
      for (const ch of channels) supabase.removeChannel(ch);
    };
    // Re-subscribe only when the actual set of conversations changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationIds.join(","), selfUserId]);

  return typingSet;
}
