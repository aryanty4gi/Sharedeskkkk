import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, CheckCheck, MoreHorizontal, Reply, Pencil, Trash2, Star, Forward,
} from "lucide-react";
import type { Message, Profile, Reaction } from "@/lib/chat/queries";
import { formatMessageTime, formatFullTime, isDocumentFile, cleanAttachmentContent, getReplyPreview } from "@/lib/chat/format";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "./user-avatar";
import { Textarea } from "@/components/ui/textarea";
import { ReactionBar, ReactionPicker } from "./reaction-bar";
import { ImageAttachment, FileAttachment } from "./attachment-view";
import { cn } from "@/lib/utils";

export function MessageBubble({
  message, isMine, sender, showAvatar, isRead, isStarred, reactions, currentUserId,
  onReply, onEdit, onDelete, onStar, onForward, onReact, replySource,
}: {
  message: Message;
  isMine: boolean;
  sender: Profile | undefined;
  showAvatar: boolean;
  isRead: boolean;
  isStarred: boolean;
  reactions: Reaction[];
  currentUserId: string;
  onReply: () => void;
  onEdit: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onStar: () => void;
  onForward: () => void;
  onReact: (emoji: string) => void;
  replySource: Message | null;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content ?? "");
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (editing) { setDraft(message.content ?? ""); ref.current?.focus(); }
  }, [editing, message.content]);

  const commitEdit = async () => {
    const t = draft.trim();
    if (!t || t === message.content) { setEditing(false); return; }
    await onEdit(message.id, t);
    setEditing(false);
  };

  const deleted = !!message.deleted_at;
  const isImage = message.message_type === "image" && !deleted;
  const isFile = message.message_type === "file" && !deleted;
  
  const { hasRealText, cleanedText } = cleanAttachmentContent(message.content, message.file_name);
  const hasText = hasRealText && !deleted;

  const bubbleClass = cn(
    "rounded-2xl text-sm shadow-sm",
    (isImage || isFile) && !hasText ? "p-1.5" : "px-3.5 py-2",
    isMine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border rounded-bl-sm",
    deleted && "italic opacity-70 px-3.5 py-2",
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className={cn("group flex gap-2", isMine ? "justify-end" : "justify-start")}
    >
      {!isMine && (
        <div className="w-8 shrink-0">
          {showAvatar && sender && <UserAvatar profile={sender} size="sm" />}
        </div>
      )}

      <div className={cn("flex max-w-[75%] min-w-0 flex-col", isMine ? "items-end" : "items-start")}>
        {!isMine && showAvatar && sender && (
          <span className="mb-0.5 text-[11px] font-medium text-muted-foreground">
            {sender.full_name || sender.email}
          </span>
        )}

        <div className={cn("relative flex items-center gap-1", isMine ? "flex-row-reverse" : "flex-row")}>
          <div className={bubbleClass}>
            {replySource && (
              <div className={cn(
                "mb-1.5 rounded-md border-l-2 px-2 py-1 text-xs",
                isMine ? "border-white/40 bg-white/10" : "border-primary bg-muted",
              )}>
                <div className="truncate opacity-80">
                  {replySource.deleted_at ? "This message was deleted" : getReplyPreview(replySource)}
                </div>
              </div>
            )}

            {isImage && <ImageAttachment message={message} isMine={isMine} />}
            {isFile && <FileAttachment message={message} isMine={isMine} />}

            {editing && !deleted ? (
              <Textarea
                ref={ref}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitEdit(); }
                  if (e.key === "Escape") setEditing(false);
                }}
                onBlur={commitEdit}
                rows={1}
                className="mt-1 min-w-[220px] resize-none border-none bg-transparent p-0 text-sm text-inherit focus-visible:ring-0"
              />
            ) : (
              (hasText || deleted) && (
                <div className={cn("whitespace-pre-wrap break-words", (isImage || isFile) && "mt-1.5 px-1.5")}>
                  {deleted ? "This message was deleted" : cleanedText}
                </div>
              )
            )}

            <div className={cn(
              "mt-1 flex items-center gap-1 text-[10px]",
              (isImage || isFile) && "px-1.5 pb-0.5",
              isMine ? "justify-end text-primary-foreground/70" : "text-muted-foreground",
            )}>
              {isStarred && <Star className="size-3 fill-current" />}
              <span title={formatFullTime(message.created_at)}>{formatMessageTime(message.created_at)}</span>
              {message.edited_at && !deleted && <span className="italic">· edited</span>}
              {isMine && !deleted && (
                isRead
                  ? <CheckCheck className="size-3 text-sky-300" />
                  : <Check className="size-3 opacity-70" />
              )}
            </div>
          </div>

          {!deleted && (
            <div className={cn("flex items-center opacity-0 transition-opacity group-hover:opacity-100")}>
              <ReactionPicker onPick={onReact} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <MoreHorizontal className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isMine ? "end" : "start"} className="w-44">
                  <DropdownMenuItem onSelect={onReply}>
                    <Reply className="mr-2 size-4" /> Reply
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onForward}>
                    <Forward className="mr-2 size-4" /> Forward
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onStar}>
                    <Star className={cn("mr-2 size-4", isStarred && "fill-current")} />
                    {isStarred ? "Unstar" : "Star"}
                  </DropdownMenuItem>
                  {isMine && (
                    <>
                      <DropdownMenuSeparator />
                      {message.message_type === "text" && (
                        <DropdownMenuItem onSelect={() => setEditing(true)}>
                          <Pencil className="mr-2 size-4" /> Edit
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onSelect={() => onDelete(message.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 size-4" /> Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {!deleted && (
          <ReactionBar
            reactions={reactions}
            currentUserId={currentUserId}
            isMine={isMine}
            onToggle={onReact}
          />
        )}
      </div>
    </motion.div>
  );
}

export function TypingBubble({ sender }: { sender: Profile | null }) {
  return (
    <AnimatePresence>
      <motion.div
        key="typing"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="flex items-center gap-2"
      >
        <div className="w-8 shrink-0">
          {sender && <UserAvatar profile={sender} size="sm" />}
        </div>
        <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-border bg-card px-3.5 py-2.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-1.5 rounded-full bg-muted-foreground"
              animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
