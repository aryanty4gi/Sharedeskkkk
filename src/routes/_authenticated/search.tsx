import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search as SearchIcon, MessageSquare, FileText, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/chat/user-avatar";
import { useCurrentUser } from "@/lib/chat/use-current-user";
import {
  searchEverything, getOrCreateConversation, fetchStarredMessages, type Message, type Profile,
} from "@/lib/chat/queries";
import { usePresence } from "./index";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/search")({
  component: SearchPage,
});

function SearchPage() {
  const { user } = useCurrentUser();
  usePresence(user?.id);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const { data: results } = useQuery({
    queryKey: ["search", user?.id, q],
    queryFn: () => searchEverything(user!.id, q),
    enabled: !!user && q.trim().length >= 2,
  });

  const { data: starred = [] } = useQuery({
    queryKey: ["starred-messages", user?.id],
    queryFn: () => fetchStarredMessages(user!.id),
    enabled: !!user,
  });

  const openWith = async (userId: string) => {
    if (!user) return;
    try {
      const cid = await getOrCreateConversation(user.id, userId);
      await navigate({ to: "/chat/$conversationId", params: { conversationId: cid } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const openConv = async (m: Message) =>
    navigate({ to: "/chat/$conversationId", params: { conversationId: m.conversation_id } });

  if (!user) return null;

  const hasQuery = q.trim().length >= 2;

  return (
    <div className="mx-auto flex h-screen w-full max-w-4xl flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <Link to="/" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people, messages, files…"
            className="h-10 pl-9 text-sm"
          />
        </div>
      </header>

      <Tabs defaultValue="all" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-4 mt-3 grid w-fit grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
          <TabsContent value="all" className="mt-0 space-y-6">
            {!hasQuery ? (
              <StarredSection starred={starred} onOpen={openConv} />
            ) : (
              <>
                <Section title="People" icon={<User className="size-4" />}>
                  <PeopleList items={results?.users ?? []} onOpen={openWith} />
                </Section>
                <Section title="Messages" icon={<MessageSquare className="size-4" />}>
                  <MessageList items={results?.messages ?? []} onOpen={openConv} highlight={q} />
                </Section>
                <Section title="Files" icon={<FileText className="size-4" />}>
                  <MessageList items={results?.files ?? []} onOpen={openConv} highlight={q} />
                </Section>
              </>
            )}
          </TabsContent>
          <TabsContent value="people" className="mt-0">
            <PeopleList items={results?.users ?? []} onOpen={openWith} />
          </TabsContent>
          <TabsContent value="messages" className="mt-0">
            <MessageList items={results?.messages ?? []} onOpen={openConv} highlight={q} />
          </TabsContent>
          <TabsContent value="files" className="mt-0">
            <MessageList items={results?.files ?? []} onOpen={openConv} highlight={q} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {title}
      </h2>
      {children}
    </section>
  );
}

function StarredSection({ starred, onOpen }: { starred: Message[]; onOpen: (m: Message) => void }) {
  return (
    <Section title="Starred messages" icon={<MessageSquare className="size-4" />}>
      {starred.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No starred messages yet. Star messages from any chat to save them here.
        </p>
      ) : (
        <MessageList items={starred} onOpen={onOpen} />
      )}
    </Section>
  );
}

function PeopleList({ items, onOpen }: { items: Profile[]; onOpen: (id: string) => void }) {
  if (items.length === 0) return <Empty label="No people match." />;
  return (
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {items.map((u) => (
        <li key={u.id}>
          <button
            onClick={() => onOpen(u.id)}
            className="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted"
          >
            <UserAvatar profile={u} size="md" showStatus />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{u.full_name || u.email}</div>
              <div className="truncate text-xs text-muted-foreground">
                {[u.designation, u.department].filter(Boolean).join(" · ") || u.email}
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function MessageList({
  items, onOpen, highlight,
}: { items: Message[]; onOpen: (m: Message) => void; highlight?: string }) {
  if (items.length === 0) return <Empty label="Nothing to show." />;
  return (
    <ul className="space-y-1.5">
      {items.map((m) => (
        <li key={m.id}>
          <button
            onClick={() => onOpen(m)}
            className={cn(
              "flex w-full items-start gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-colors",
              "hover:bg-muted",
            )}
          >
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
              {m.message_type === "text"
                ? <MessageSquare className="size-3.5 text-muted-foreground" />
                : <FileText className="size-3.5 text-muted-foreground" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 text-sm">
                {m.message_type === "text"
                  ? <Highlight text={m.content ?? ""} term={highlight} />
                  : <><Highlight text={m.file_name ?? "Attachment"} term={highlight} /></>}
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Highlight({ text, term }: { text: string; term?: string }) {
  if (!term || term.trim().length < 2) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-primary/20 px-0.5 text-foreground">{text.slice(idx, idx + term.length)}</mark>
      {text.slice(idx + term.length)}
    </>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {label}
    </p>
  );
}
