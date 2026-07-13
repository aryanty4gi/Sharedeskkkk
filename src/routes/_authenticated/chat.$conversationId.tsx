import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatWindow } from "@/components/chat/chat-window";
import { useCurrentUser } from "@/lib/chat/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/chat/queries";
import { usePresence } from "./index";

export const Route = createFileRoute("/_authenticated/chat/$conversationId")({
  component: ChatDetail,
});

function ChatDetail() {
  const { user } = useCurrentUser();
  const { conversationId } = useParams({ from: "/_authenticated/chat/$conversationId" });
  usePresence(user?.id);

  const { data, isLoading, error } = useQuery({
    queryKey: ["conversation-other", conversationId, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: parts, error: partsErr } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationId);
      if (partsErr) throw partsErr;
      const otherId = (parts ?? []).map((p) => p.user_id).find((id) => id !== user!.id);
      if (!otherId) return null;
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", otherId)
        .maybeSingle();
      if (profErr) throw profErr;
      return prof as Profile | null;
    },
  });

  if (!user) return null;

  return (
    <div className="grid h-screen w-screen grid-cols-1 md:grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr]">
      <div className="hidden md:block">
        <ChatSidebar userId={user.id} />
      </div>

      <div className="flex h-full min-h-0 flex-col">
        {/* Mobile back button */}
        <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2 md:hidden">
          <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Chats
          </Link>
        </div>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-1 items-center justify-center text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load conversation"}
          </div>
        ) : !data ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Conversation not found.
          </div>
        ) : (
          <ChatWindow conversationId={conversationId} userId={user.id} other={data} />
        )}
      </div>
    </div>
  );
}
