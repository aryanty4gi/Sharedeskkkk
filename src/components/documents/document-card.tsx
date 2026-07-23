import { memo, useMemo, useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { Download, FolderInput, MoreVertical, Pencil, Pin, Star, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/chat/user-avatar";
import type { EnterpriseDocument } from "@/lib/documents/types";
import { getFileTypeInfo, formatFileSize } from "@/lib/documents/utils";
import { cn } from "@/lib/utils";

interface DocumentCardProps {
  document: EnterpriseDocument;
  currentUserId: string;
  onDownload: (doc: EnterpriseDocument) => void;
  onDelete: (doc: EnterpriseDocument) => void;
  onRename: (doc: EnterpriseDocument) => void;
  onMove: (doc: EnterpriseDocument) => void;
  onToggleFavorite: (docId: string) => void;
  onTogglePin: (docId: string) => void;
}

export const DocumentCard = memo(function DocumentCard({
  document,
  currentUserId,
  onDownload,
  onDelete,
  onRename,
  onMove,
  onToggleFavorite,
  onTogglePin,
}: DocumentCardProps) {
  const [downloading, setDownloading] = useState(false);
  const typeInfo = useMemo(
    () => getFileTypeInfo(document.file_name, document.file_mime),
    [document.file_name, document.file_mime],
  );
  const IconComponent = typeInfo.icon;
  const isOwner = document.uploaded_by === currentUserId;

  const ownerProfile = useMemo(
    () =>
      document.profiles
        ? {
            id: document.profiles.id,
            email: document.profiles.email,
            full_name: document.profiles.full_name,
            avatar_url: document.profiles.avatar_url,
            is_online: false,
          }
        : {
            id: document.uploaded_by,
            email: "Unknown owner",
            full_name: "Unknown",
            avatar_url: null,
            is_online: false,
          },
    [document.profiles, document.uploaded_by],
  );

  const ownerDisplayName =
    document.profiles?.full_name || document.profiles?.email || "Team member";
  const formattedDate = formatDistanceToNow(new Date(document.created_at), { addSuffix: true });
  const exactDate = format(new Date(document.created_at), "MMM d, yyyy");

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await onDownload(document);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/40 hover:shadow-md",
        document.isPinned && "border-primary/30 bg-primary/5",
      )}
    >
      {/* Top Header: File Icon + Title + Menu */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg border",
              typeInfo.color,
            )}
          >
            <IconComponent className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <h3
              className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors cursor-pointer"
              title={document.file_name}
              onClick={handleDownload}
            >
              {document.file_name}
            </h3>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
              {formatFileSize(document.file_size)} • {typeInfo.label}
            </p>
          </div>
        </div>

        {/* Action Controls & Badges */}
        <div className="flex items-center gap-1 shrink-0">
          {document.isPinned && (
            <span title="Pinned document" className="text-primary">
              <Pin className="size-3.5 fill-primary" />
            </span>
          )}
          {document.isFavorite && (
            <span title="Favorite document" className="text-amber-500">
              <Star className="size-3.5 fill-amber-500" />
            </span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
              >
                <MoreVertical className="size-4" />
                <span className="sr-only">Document actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleDownload} disabled={downloading}>
                <Download className="mr-2 size-4" /> Download
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleFavorite(document.id)}>
                <Star
                  className={cn(
                    "mr-2 size-4",
                    document.isFavorite && "fill-amber-500 text-amber-500",
                  )}
                />
                {document.isFavorite ? "Unfavorite" : "Favorite"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTogglePin(document.id)}>
                <Pin
                  className={cn("mr-2 size-4", document.isPinned && "fill-primary text-primary")}
                />
                {document.isPinned ? "Unpin" : "Pin to top"}
              </DropdownMenuItem>

              {isOwner && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onRename(document)}>
                    <Pencil className="mr-2 size-4" /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMove(document)}>
                    <FolderInput className="mr-2 size-4" /> Move Department
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(document)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 size-4" /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Footer Info: Department Badge + Owner Avatar & Date */}
      <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2 text-xs">
        <Badge variant="secondary" className="text-[10px] font-normal truncate max-w-28">
          {document.department}
        </Badge>

        <div className="flex items-center gap-2 min-w-0">
          <UserAvatar profile={ownerProfile} size="sm" />
          <div className="flex flex-col text-right min-w-0">
            <span
              className="text-[11px] font-medium text-foreground truncate max-w-24"
              title={ownerDisplayName}
            >
              {ownerDisplayName}
            </span>
            <span className="text-[10px] text-muted-foreground truncate" title={exactDate}>
              {formattedDate}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
