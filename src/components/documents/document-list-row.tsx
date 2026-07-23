import { memo, useMemo, useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { Download, FolderInput, MoreVertical, Pencil, Pin, Star, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
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

interface DocumentListRowProps {
  document: EnterpriseDocument;
  currentUserId: string;
  onDownload: (doc: EnterpriseDocument) => void;
  onDelete: (doc: EnterpriseDocument) => void;
  onRename: (doc: EnterpriseDocument) => void;
  onMove: (doc: EnterpriseDocument) => void;
  onToggleFavorite: (docId: string) => void;
  onTogglePin: (docId: string) => void;
}

export const DocumentListRow = memo(function DocumentListRow({
  document,
  currentUserId,
  onDownload,
  onDelete,
  onRename,
  onMove,
  onToggleFavorite,
  onTogglePin,
}: DocumentListRowProps) {
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
    <TableRow
      className={cn(
        "hover:bg-muted/40 transition-colors group",
        document.isPinned && "bg-primary/5",
      )}
    >
      {/* File Name + Icon + Badges */}
      <TableCell className="font-medium">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg border",
              typeInfo.color,
            )}
          >
            <IconComponent className="size-4.5" />
          </div>

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className="truncate text-sm font-semibold text-foreground hover:text-primary cursor-pointer transition-colors"
              title={document.file_name}
              onClick={handleDownload}
            >
              {document.file_name}
            </span>

            {document.isPinned && (
              <span title="Pinned document" className="text-primary shrink-0">
                <Pin className="size-3.5 fill-primary" />
              </span>
            )}
            {document.isFavorite && (
              <span title="Favorite document" className="text-amber-500 shrink-0">
                <Star className="size-3.5 fill-amber-500" />
              </span>
            )}
          </div>
        </div>
      </TableCell>

      {/* Owner */}
      <TableCell>
        <div className="flex items-center gap-2">
          <UserAvatar profile={ownerProfile} size="sm" />
          <span className="truncate text-xs font-medium text-foreground max-w-32">
            {ownerDisplayName}
          </span>
        </div>
      </TableCell>

      {/* Department */}
      <TableCell>
        <Badge variant="secondary" className="text-xs font-normal truncate max-w-32">
          {document.department}
        </Badge>
      </TableCell>

      {/* Size */}
      <TableCell className="text-xs text-muted-foreground font-mono">
        {formatFileSize(document.file_size)}
      </TableCell>

      {/* Last Modified Date */}
      <TableCell className="text-xs text-muted-foreground" title={exactDate}>
        {formattedDate}
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            title="Download file"
            onClick={handleDownload}
            disabled={downloading}
            className="size-8 text-muted-foreground hover:text-foreground"
          >
            <Download className="size-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground"
              >
                <MoreVertical className="size-4" />
                <span className="sr-only">Actions</span>
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
      </TableCell>
    </TableRow>
  );
});
