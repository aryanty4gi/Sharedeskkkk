import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/chat/format";
import type { Profile } from "@/lib/chat/queries";
import { cn } from "@/lib/utils";
import { useProfileAvatarUrl } from "@/lib/chat/use-signed-url";

export function UserAvatar({
  profile,
  size = "md",
  showStatus = false,
  className,
}: {
  profile: Pick<Profile, "id" | "email" | "full_name" | "avatar_url" | "is_online">;
  size?: "sm" | "md" | "lg" | "xl";
  showStatus?: boolean;
  className?: string;
}) {
  const avatarUrl = useProfileAvatarUrl(profile.avatar_url);
  const sizes = { sm: "size-7 text-[10px]", md: "size-9 text-xs", lg: "size-11 text-sm", xl: "size-16 text-base" };
  return (
    <div className={cn("relative", className)}>
      <Avatar className={sizes[size]}>
        {avatarUrl && <AvatarImage src={avatarUrl} alt={profile.full_name ?? profile.email} />}
        <AvatarFallback className="bg-primary/10 font-semibold text-primary">
          {initials(profile.full_name, profile.email)}
        </AvatarFallback>
      </Avatar>
      {showStatus && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-background transition-colors",
            profile.is_online ? "bg-emerald-500" : "bg-muted-foreground/40",
          )}
        />
      )}
    </div>
  );
}
