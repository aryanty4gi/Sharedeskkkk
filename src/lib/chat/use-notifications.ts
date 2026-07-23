import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchNotifications, type Notification as AppNotification } from "./queries";

export function useNotifications(userId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => fetchNotifications(userId!),
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`notifs:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as AppNotification;
          qc.setQueryData<AppNotification[]>(["notifications", userId], (prev = []) => [
            n,
            ...prev,
          ]);
          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            window.Notification.permission === "granted" &&
            document.visibilityState !== "visible"
          ) {
            try {
              new window.Notification("ShareDesk", {
                body: n.preview ?? "New activity",
                tag: n.id,
              });
            } catch {
              /* ignore */
            }
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: ["notifications", userId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, qc]);

  const unread = (query.data ?? []).filter((n) => !n.read_at).length;

  return { ...query, unread };
}

export async function requestBrowserNotifications() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  const N = window.Notification;
  if (N.permission === "granted" || N.permission === "denied") return N.permission;
  return N.requestPermission();
}
