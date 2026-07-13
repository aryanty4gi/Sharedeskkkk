import { formatDistanceToNowStrict, format, isToday, isYesterday, differenceInMinutes } from "date-fns";

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
