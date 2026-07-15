import { useState, useRef, useEffect, KeyboardEvent, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X, Reply, Paperclip, Loader2, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Message, Profile, UploadedFile } from "@/lib/chat/queries";
import { uploadAttachment, sendFileMessage, sendMessage } from "@/lib/chat/queries";
import { cn } from "@/lib/utils";
import { getReplyPreview } from "@/lib/chat/format";

const MAX_BYTES = 20 * 1024 * 1024;

type Pending = { file: File; upload?: UploadedFile; error?: string; uploading?: boolean };

export function MessageComposer({
  conversationId, senderId, onTyping, replyTo, onCancelReply, senderMap,
}: {
  conversationId: string;
  senderId: string;
  onTyping: () => void;
  replyTo: Message | null;
  onCancelReply: () => void;
  senderMap: Map<string, Profile>;
}) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { if (replyTo) ref.current?.focus(); }, [replyTo]);

  const startUpload = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files);
    const next: Pending[] = arr.map((file) =>
      file.size > MAX_BYTES
        ? { file, error: "Too large (max 20MB)" }
        : { file, uploading: true },
    );
    setPending((p) => [...p, ...next]);
    for (const item of next) {
      if (item.error) continue;
      try {
        const upload = await uploadAttachment(conversationId, senderId, item.file);
        setPending((p) => p.map((x) => (x.file === item.file ? { file: x.file, upload } : x)));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Upload failed";
        setPending((p) => p.map((x) => (x.file === item.file ? { file: x.file, error: msg } : x)));
      }
    }
  }, [conversationId, senderId]);

  const submit = async () => {
    const trimmed = text.trim();
    const readyFiles = pending.filter((p) => p.upload);
    if (!trimmed && readyFiles.length === 0) return;
    if (pending.some((p) => p.uploading)) return;
    setBusy(true);
    try {
      // Send each file as its own message (caption applied only to first)
      for (let i = 0; i < readyFiles.length; i++) {
        await sendFileMessage(
          conversationId,
          senderId,
          readyFiles[i].upload!,
          i === 0 ? trimmed : undefined,
          i === 0 ? replyTo?.id : undefined,
        );
      }
      if (readyFiles.length === 0 && trimmed) {
        await sendMessage(conversationId, senderId, trimmed, replyTo?.id);
      }
      setText("");
      setPending([]);
      onCancelReply();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  const replyingTo = replyTo ? senderMap.get(replyTo.sender_id) : null;

  const onDragEnter = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragging(true); }
  };
  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) e.preventDefault();
  };
  const onDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget === e.target) setDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) void startUpload(e.dataTransfer.files);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files ?? []);
    if (files.length) { e.preventDefault(); void startUpload(files); }
  };

  const disabled = busy || pending.some((p) => p.uploading);

  return (
    <div
      className={cn(
        "relative border-t border-border bg-card px-3 py-2.5 sm:px-4",
        dragging && "bg-primary/5",
      )}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary/60 bg-primary/5 text-sm font-medium text-primary">
          Drop files to attach
        </div>
      )}

      {replyTo && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 flex items-start gap-2 rounded-md border-l-2 border-primary bg-muted/50 px-3 py-2"
        >
          <Reply className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-medium uppercase tracking-wide text-primary">
              Replying to {replyingTo?.full_name ?? replyingTo?.email ?? "message"}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {replyTo.deleted_at ? "Deleted message" : getReplyPreview(replyTo)}
            </div>
          </div>
          <button onClick={onCancelReply} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </motion.div>
      )}

      {pending.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          <AnimatePresence>
            {pending.map((p, i) => {
              const isImg = p.file.type.startsWith("image/");
              return (
                <motion.div
                  key={`${p.file.name}-${i}`}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={cn(
                    "group relative flex items-center gap-2 rounded-lg border px-2.5 py-1.5 pr-7 text-xs",
                    p.error ? "border-destructive/50 bg-destructive/10" : "border-border bg-muted/60",
                  )}
                >
                  {p.uploading ? (
                    <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                  ) : isImg ? (
                    <ImageIcon className="size-3.5 text-muted-foreground" />
                  ) : (
                    <FileText className="size-3.5 text-muted-foreground" />
                  )}
                  <span className="max-w-[140px] truncate">
                    {p.error ?? p.file.name}
                  </span>
                  <button
                    onClick={() => setPending((s) => s.filter((_, j) => j !== i))}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-background"
                  >
                    <X className="size-3" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <div className="flex items-end gap-2">
        <Button
          size="icon"
          variant="ghost"
          className="size-10 shrink-0 rounded-full"
          onClick={() => fileInputRef.current?.click()}
          title="Attach file"
        >
          <Paperclip className="size-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void startUpload(e.target.files);
            e.target.value = "";
          }}
        />
        <Textarea
          ref={ref}
          value={text}
          onChange={(e) => { setText(e.target.value); onTyping(); }}
          onKeyDown={onKey}
          onPaste={onPaste}
          placeholder="Type a message, paste or drop files…"
          rows={1}
          className={cn(
            "min-h-[40px] max-h-40 resize-none rounded-2xl border-input bg-background text-sm",
            "focus-visible:ring-1 focus-visible:ring-primary/40",
          )}
        />
        <Button
          onClick={submit}
          disabled={disabled || (!text.trim() && !pending.some((p) => p.upload))}
          size="icon"
          className="size-10 shrink-0 rounded-full"
          title="Send"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
