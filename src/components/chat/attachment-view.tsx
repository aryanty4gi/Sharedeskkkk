import { FileText, Download, Loader2, Image as ImageIcon } from "lucide-react";
import { useSignedUrl } from "@/lib/chat/use-signed-url";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/chat/queries";

function formatBytes(n: number | null) {
  if (!n || n <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function ImageAttachment({ message, isMine }: { message: Message; isMine: boolean }) {
  const { data: url, isLoading } = useSignedUrl(message.file_url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "relative block max-w-[280px] overflow-hidden rounded-xl border",
        isMine ? "border-white/20" : "border-border",
      )}
    >
      {isLoading || !url ? (
        <div className="flex aspect-video items-center justify-center bg-muted">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <img
          src={url}
          alt={message.file_name ?? "image"}
          className="block max-h-[320px] w-full object-cover"
          loading="lazy"
        />
      )}
    </a>
  );
}

export function FileAttachment({ message, isMine }: { message: Message; isMine: boolean }) {
  const { data: url } = useSignedUrl(message.file_url);
  const isImg = message.file_mime?.startsWith("image/");
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-2 max-w-[300px]",
        isMine ? "border-white/25 bg-white/10" : "border-border bg-muted/50",
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          isMine ? "bg-white/20" : "bg-background",
        )}
      >
        {isImg ? <ImageIcon className="size-4" /> : <FileText className="size-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">{message.file_name}</div>
        <div className={cn("text-[10px]", isMine ? "opacity-80" : "text-muted-foreground")}>
          {formatBytes(message.file_size)}
        </div>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        download={message.file_name ?? undefined}
        className={cn(
          "shrink-0 rounded-md p-1.5 transition-colors",
          isMine ? "hover:bg-white/15" : "hover:bg-background",
        )}
        title="Download"
      >
        <Download className="size-3.5" />
      </a>
    </div>
  );
}
