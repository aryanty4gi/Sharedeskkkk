import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { fetchDirectory, fetchMyProfile, getOrCreateConversation, type Profile } from "@/lib/chat/queries";
import { UserAvatar } from "./user-avatar";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export function NewChatDialog({
  open, onOpenChange, currentUserId,
}: { open: boolean; onOpenChange: (v: boolean) => void; currentUserId: string }) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: people = [], isLoading } = useQuery({
    queryKey: ["directory", currentUserId],
    queryFn: () => fetchDirectory(currentUserId),
    enabled: open,
  });

  const { data: me } = useQuery({
    queryKey: ["profile", currentUserId],
    queryFn: () => fetchMyProfile(currentUserId),
    enabled: open,
  });

  const startChat = useMutation({
    mutationFn: (other: Profile) => getOrCreateConversation(currentUserId, other.id),
    onSuccess: (conversationId) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      onOpenChange(false);
      setQ("");
      navigate({ to: "/chat/$conversationId", params: { conversationId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const query = q.trim().toLowerCase();

  const filtered = people.filter((p) => {
    if (!query) return true;

    const hay = [
      p.full_name,
      p.email,
      p.department,
      p.designation,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return hay.includes(query);
  });

  const grouped = filtered.reduce<Record<string, Profile[]>>((groups, person) => {
    const department = person.department?.trim() || "Other";
    (groups[department] ??= []).push(person);
    return groups;
  }, {});

  const departments = Object.keys(grouped).sort((a, b) => {
    const myDepartment = me?.department?.trim();

    if (myDepartment) {
      if (a === myDepartment && b !== myDepartment) return -1;
      if (b === myDepartment && a !== myDepartment) return 1;
    }

    if (a === "Other") return 1;
    if (b === "Other") return -1;

    return a.localeCompare(b);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="border-b border-border px-5 pt-5 pb-3">
          <DialogTitle>Start a new chat</DialogTitle>
          <DialogDescription>
            Browse colleagues by department or search company-wide.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, department..."
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto scrollbar-thin pb-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading team...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No colleagues found.
            </div>
          ) : (
            departments.map((department) => {
              const isMyDepartment =
                Boolean(me?.department) &&
                department === me?.department?.trim();

              return (
                <section key={department}>
                  <div className="sticky top-0 z-10 flex items-center gap-2 border-y border-border bg-card px-5 py-2">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                      {department}
                    </span>

                    {isMyDepartment && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
                        Your department
                      </span>
                    )}

                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {grouped[department].length}
                    </span>
                  </div>

                  <ul>
                    {grouped[department].map((p) => (
                      <li key={p.id}>
                        <button
                          onClick={() => startChat.mutate(p)}
                          disabled={startChat.isPending}
                          className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-muted disabled:opacity-60"
                        >
                          <UserAvatar profile={p} showStatus />

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">
                              {p.full_name || p.email}
                            </div>

                            <div className="truncate text-xs text-muted-foreground">
                              {p.designation || p.email}
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
