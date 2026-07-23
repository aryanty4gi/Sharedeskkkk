import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "./user-avatar";
import {
  fetchDirectory,
  forwardMessage,
  getOrCreateConversation,
  type Message,
} from "@/lib/chat/queries";
import { cn } from "@/lib/utils";

export function ForwardDialog({
  open,
  onOpenChange,
  message,
  currentUserId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  message: Message | null;
  currentUserId: string;
}) {
  const [q, setQ] = useState("");
  const [sending, setSending] = useState<string | null>(null);

  const { data: users = [] } = useQuery({
    queryKey: ["directory", currentUserId],
    queryFn: () => fetchDirectory(currentUserId),
    enabled: open,
  });

  const filtered = users.filter((u) => {
    if (!q.trim()) return true;
    const t = q.toLowerCase();
    return (
      (u.full_name ?? "").toLowerCase().includes(t) ||
      u.email.toLowerCase().includes(t) ||
      (u.department ?? "").toLowerCase().includes(t)
    );
  });

  const send = async (otherId: string) => {
    if (!message) return;
    setSending(otherId);
    try {
      const cid = await getOrCreateConversation(currentUserId, otherId);
      await forwardMessage(message, cid, currentUserId);
      toast.success("Forwarded");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSending(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Forward message</DialogTitle>
        </DialogHeader>
        {message && (
          <div className="mb-1 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <div className="line-clamp-2">
              {message.deleted_at
                ? "Deleted message"
                : (message.content ?? message.file_name ?? "Attachment")}
            </div>
          </div>
        )}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search colleagues…"
            className="pl-8"
          />
        </div>
        <div className="max-h-72 overflow-y-auto scrollbar-thin">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No matches.</p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((u) => (
                <li key={u.id}>
                  <button
                    disabled={sending !== null}
                    onClick={() => send(u.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors",
                      "hover:bg-muted disabled:opacity-60",
                    )}
                  >
                    <UserAvatar profile={u} size="md" showStatus />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{u.full_name || u.email}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {[u.designation, u.department].filter(Boolean).join(" · ") || u.email}
                      </div>
                    </div>
                    <Button size="sm" variant={sending === u.id ? "secondary" : "outline"}>
                      {sending === u.id ? "Sending…" : "Send"}
                    </Button>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
