import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { useCurrentUser } from "@/lib/chat/use-current-user";
import { pingPresence } from "@/lib/chat/queries";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/")({
  component: ChatHome,
});

function ChatHome() {
  const { user } = useCurrentUser();
  usePresence(user?.id);

  if (!user) return null;
  return (
    <div className="grid h-screen w-screen grid-cols-1 md:grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr]">
      <ChatSidebar userId={user.id} />
      <EmptyChat />
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="hidden h-full flex-col items-center justify-center bg-background p-8 text-center md:flex">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex size-20 items-center justify-center rounded-3xl bg-primary/10"
      >
        <MessageSquare className="size-8 text-primary" />
      </motion.div>
      <h2 className="mt-6 text-xl font-semibold tracking-tight">Welcome to ShareDesk</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Pick a conversation from the left, or start a new chat with a colleague to begin messaging.
      </p>
    </div>
  );
}

/** Keep presence updated: mark online on mount, offline on unmount + tab hidden. */
export function usePresence(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    pingPresence(userId, true);
    const interval = window.setInterval(() => pingPresence(userId, true), 30_000);
    const onVis = () => pingPresence(userId, document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    const onUnload = () => {
      // Best-effort: fire-and-forget
      pingPresence(userId, false);
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", onUnload);
      pingPresence(userId, false);
      void supabase; // keep import
    };
  }, [userId]);
}
