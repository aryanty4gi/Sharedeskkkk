import {
  formatDistanceToNowStrict,
  format,
  isToday,
  isYesterday,
  differenceInMinutes,
} from "date-fns";

export function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

export function formatFullTime(iso: string): string {
  return format(new Date(iso), "MMM d, yyyy HH:mm");
}

export function formatLastSeen(iso: string, isOnline: boolean): string {
  if (isOnline) return "Online";
  const mins = differenceInMinutes(new Date(), new Date(iso));
  if (mins < 2) return "Online";
  return `Last seen ${formatDistanceToNowStrict(new Date(iso), { addSuffix: true })}`;
}

export function initials(name: string | null | undefined, email: string): string {
  const src = (name && name.trim()) || email;
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

import type { Message } from "./queries";

export function isDocumentFile(mime: string | null, filename: string | null): boolean {
  if (!mime && !filename) return false;
  const m = mime?.toLowerCase() || "";
  const name = filename?.toLowerCase() || "";
  return (
    m === "application/pdf" ||
    m.includes("word") ||
    m.includes("excel") ||
    m.includes("spreadsheet") ||
    m.includes("presentation") ||
    m.includes("powerpoint") ||
    m.startsWith("text/") ||
    name.endsWith(".pdf") ||
    name.endsWith(".doc") ||
    name.endsWith(".docx") ||
    name.endsWith(".xls") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".ppt") ||
    name.endsWith(".pptx") ||
    name.endsWith(".txt") ||
    name.endsWith(".csv")
  );
}

export function getAttachmentDetailsFromContent(content: string | null): string | null {
  if (!content) return null;
  const trimmed = content.trim();

  // Generic filename matching pattern at the end of the text.
  // Matches typical filename characters followed by a dot and a 2-4 character extension.
  const fileMatch = trimmed.match(/([a-zA-Z0-9_-\s.]+\.[a-zA-Z0-9]{2,4})$/);
  if (!fileMatch) return null;

  const parsedFilename = fileMatch[1];
  const prefix = trimmed.slice(0, -parsedFilename.length).trim();

  // If there is no prefix, it is exactly a filename.
  if (prefix.length === 0) {
    return parsedFilename;
  }

  // If the prefix has no ASCII alphanumeric characters (such as emojis or corrupted UTF-8 bytes),
  // then we classify this as a synthetic attachment caption.
  const hasAlphanumeric = /[a-zA-Z0-9]/.test(prefix);
  if (!hasAlphanumeric) {
    return parsedFilename;
  }

  return null;
}

export function cleanAttachmentContent(
  content: string | null,
  fileName: string | null,
): { hasRealText: boolean; cleanedText: string } {
  if (!content) return { hasRealText: false, cleanedText: "" };

  const trimmedContent = content.trim();

  // If fileName is provided, check if the content ends with that exact filename
  if (fileName) {
    const trimmedFileName = fileName.trim();
    if (trimmedContent === trimmedFileName) {
      return { hasRealText: false, cleanedText: "" };
    }
    if (trimmedContent.endsWith(trimmedFileName)) {
      const prefix = trimmedContent.slice(0, -trimmedFileName.length).trim();
      const hasAlphanumeric = /[a-zA-Z0-9]/.test(prefix);
      if (!hasAlphanumeric) {
        return { hasRealText: false, cleanedText: "" };
      }
    }
  }

  // Parse generically. If it matches a synthetic filename with non-alphanumeric prefix, treat as no caption text.
  const parsedFilename = getAttachmentDetailsFromContent(content);
  if (parsedFilename) {
    return { hasRealText: false, cleanedText: "" };
  }

  return {
    hasRealText: trimmedContent.length > 0,
    cleanedText: trimmedContent,
  };
}

export type SidebarPreview = {
  text: string;
  type: "text" | "image" | "document" | "attachment" | "deleted" | "none";
};

export function getSidebarPreview(message: Message | null): SidebarPreview {
  if (!message) {
    return { text: "No messages yet", type: "none" };
  }
  if (message.deleted_at) {
    return { text: "Message deleted", type: "deleted" };
  }

  // 1. Check structured metadata
  const mime = message.file_mime?.toLowerCase() || "";
  const name = message.file_name?.toLowerCase() || "";
  const msgType = message.message_type?.toLowerCase() || "";

  // Check if content has synthetic attachment pattern
  const parsedFilename = getAttachmentDetailsFromContent(message.content);
  const isAttachment =
    msgType === "file" ||
    msgType === "image" ||
    Boolean(message.file_url || message.file_name) ||
    Boolean(parsedFilename);

  if (isAttachment) {
    const resolvedName = (message.file_name || parsedFilename || "").toLowerCase();

    const isImg =
      msgType === "image" ||
      mime.startsWith("image/") ||
      /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(resolvedName);

    if (isImg) {
      return { text: "Photo", type: "image" };
    }

    const isDoc =
      mime === "application/pdf" ||
      mime.includes("word") ||
      mime.includes("excel") ||
      mime.includes("spreadsheet") ||
      mime.includes("presentation") ||
      mime.includes("powerpoint") ||
      mime.startsWith("text/") ||
      /\.(pdf|docx?|xlsx?|pptx?|txt|csv|ods|odt)$/i.test(resolvedName);

    if (isDoc) {
      return { text: "Document", type: "document" };
    }

    return { text: "Attachment", type: "attachment" };
  }

  // 2. Normal text message
  return { text: message.content ?? "No messages yet", type: "text" };
}

export function getReplyPreview(msg: Message): string {
  const preview = getSidebarPreview(msg);
  if (preview.type === "image" || preview.type === "document" || preview.type === "attachment") {
    return preview.text;
  }
  return msg.content ?? "";
}
