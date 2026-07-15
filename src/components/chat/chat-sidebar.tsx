import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Search, MessageSquare, Settings, LogOut, Search as SearchIcon, FolderOpen, ShieldCheck, Paperclip, Image as ImageIcon, FileText } from "lucide-react";
import { NotificationsMenu } from "./notifications-menu";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { fetchConversations, fetchMyProfile, fetchCurrentUserRole } from "@/lib/chat/queries";
import { useMultiTyping } from "@/lib/chat/use-multi-typing";
import { formatMessageTime, getSidebarPreview } from "@/lib/chat/format";
import { UserAvatar } from "./user-avatar";
import { NewChatDialog } from "./new-chat-dialog";
import { ProfileDialog } from "./profile-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";

export function ChatSidebar({ userId }: { userId: string }) {
  const [q, setQ] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { conversationId?: string };
  const activeId = params.conversationId;

  const { data: convos = [], isLoading } = useQuery({
    queryKey: ["conversations", userId],
    queryFn: () => fetchConversations(userId),
    refetchOnWindowFocus: true,
  });

  const { data: me } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchMyProfile(userId),
  });

  const { data: myRole } = useQuery({
    queryKey: ["current-role", userId],
    queryFn: () => fetchCurrentUserRole(userId),
  });

  const canAccessAdmin =
    myRole === "super_admin" || myRole === "hr_admin";

  // Realtime: refetch conversation list when any relevant table changes.
  useEffect(() => {
    const ch = supabase
      .channel(`sidebar:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["conversations"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_participants" }, () => {
        qc.invalidateQueries({ queryKey: ["conversations"] });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => {
        qc.invalidateQueries({ queryKey: ["conversations"] });
        qc.invalidateQueries({ queryKey: ["directory"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, qc]);

  const typingConvIds = useMultiTyping(convos.map((c) => c.id), userId);

  const filtered = convos.filter((c) => {
    if (!q.trim()) return true;
    return (c.other.full_name ?? c.other.email).toLowerCase().includes(q.toLowerCase());
  });

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <aside className="flex h-full flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MessageSquare className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">ShareDesk</p>
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Nuberg</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link to="/search" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Search">
            <SearchIcon className="size-4" />
          </Link>
          <NotificationsMenu userId={userId} />
          <Button size="icon" variant="ghost" onClick={() => setNewOpen(true)} title="New chat">
            <Plus className="size-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-1">
                {me && <UserAvatar profile={me} showStatus />}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {me && (
                <>
                  <DropdownMenuLabel>
                    <div className="text-sm">{me.full_name || me.email}</div>
                    <div className="text-xs font-normal text-muted-foreground flex items-center gap-1 flex-wrap">
                      {me.designation && <span>{me.designation}</span>}
                      {me.designation && me.department && <span aria-hidden="true"> · </span>}
                      {me.department && <span>{me.department}</span>}
                      {!me.designation && !me.department && <span>{me.email}</span>}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
                <Settings className="mr-2 size-4" /> Edit profile
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 size-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-border px-3 py-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search conversations..."
            className="h-9 border-transparent bg-muted/60 pl-8 text-sm focus-visible:bg-card focus-visible:border-border"
          />
        </div>
      </div>

      {/* Department Documents */}
      <div className="border-b border-border px-3 py-2">
        <Link
          to="/documents"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          activeProps={{
            className: "bg-primary/10 text-primary",
          }}
        >
          <FolderOpen className="size-4" />
          <span>Department Documents</span>
          {me?.department && (
            <span className="ml-auto max-w-24 truncate text-[10px] font-normal uppercase tracking-wider opacity-70">
              {me.department}
            </span>
          )}
        </Link>
      </div>

      {/* Administration */}
      {canAccessAdmin && (
        <div className="border-b border-border px-3 py-2">
          <Link
            to="/admin"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            activeProps={{
              className: "bg-primary/10 text-primary",
            }}
          >
            <ShieldCheck className="size-4" />
            <span>Admin Console</span>
            <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider opacity-70">
              {myRole === "super_admin" ? "Super" : "HR"}
            </span>
          </Link>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <EmptyState onNewChat={() => setNewOpen(true)} hasAny={convos.length > 0} />
        ) : (
          <ul className="py-1">
            <AnimatePresence initial={false}>
              {filtered.map((c) => {
                const isActive = c.id === activeId;
                const isTyping = typingConvIds.has(c.id);
                const preview = getSidebarPreview(c.last_message);
                const previewIcon = (() => {
                  if (preview.type === "image") {
                    return <ImageIcon className="mr-1.5 inline size-3.5 shrink-0 align-text-bottom text-muted-foreground" />;
                  }
                  if (preview.type === "document") {
                    return <FileText className="mr-1.5 inline size-3.5 shrink-0 align-text-bottom text-muted-foreground" />;
                  }
                  if (preview.type === "attachment") {
                    return <Paperclip className="mr-1.5 inline size-3.5 shrink-0 align-text-bottom text-muted-foreground" />;
                  }
                  return null;
                })();

                const previewText = preview.text;
                return (
                  <motion.li
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <Link
                      to="/chat/$conversationId"
                      params={{ conversationId: c.id }}
                      className={cn(
                        "flex items-start gap-3 py-2.5 pr-3 pl-3 mx-2 rounded-r-lg border-l-4 border-transparent transition-all",
                        isActive ? "bg-primary/10 border-primary pl-2" : "hover:bg-muted",
                      )}
                    >
                      <UserAvatar profile={c.other} showStatus size="lg" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-medium">
                            {c.other.full_name || c.other.email}
                          </span>
                          {c.last_message && (
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {formatMessageTime(c.last_message.created_at)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          {isTyping ? (
                            <span className="truncate text-xs font-medium text-primary">
                              typing<span className="ml-0.5 inline-flex gap-0.5">
                                <span className="animate-bounce [animation-delay:-0.3s]">.</span>
                                <span className="animate-bounce [animation-delay:-0.15s]">.</span>
                                <span className="animate-bounce">.</span>
                              </span>
                            </span>
                          ) : (
                            <span className={cn(
                              "truncate text-xs flex items-center",
                              c.unread_count > 0 ? "font-medium text-foreground" : "text-muted-foreground",
                            )}>
                              {previewIcon}
                              <span className="truncate">{previewText}</span>
                            </span>
                          )}
                          {c.unread_count > 0 && (
                            <span className="ml-auto shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                              {c.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <NewChatDialog open={newOpen} onOpenChange={setNewOpen} currentUserId={userId} />
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} userId={userId} />
    </aside>
  );
}

function EmptyState({ onNewChat, hasAny }: { onNewChat: () => void; hasAny: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
        <MessageSquare className="size-5 text-muted-foreground" />
      </div>
      <p className="mt-4 text-sm font-medium">{hasAny ? "No matches" : "No conversations yet"}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {hasAny ? "Try a different search." : "Start chatting with your colleagues."}
      </p>
      {!hasAny && (
        <Button size="sm" className="mt-4" onClick={onNewChat}>
          <Plus className="mr-1.5 size-4" /> New chat
        </Button>
      )}
    </div>
  );
}
