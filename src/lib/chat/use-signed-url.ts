import { useQuery } from "@tanstack/react-query";
import { getAttachmentUrl, getAvatarUrl } from "./queries";

/** Cache signed URLs for 45 minutes (URLs valid 60m). */
export function useSignedUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["signed-url", path],
    queryFn: () => getAttachmentUrl(path!),
    enabled: !!path,
    staleTime: 45 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

export function useProfileAvatarUrl(avatarUrl: string | null | undefined) {
  const isPrivate = avatarUrl && !avatarUrl.startsWith("http://") && !avatarUrl.startsWith("https://") && !avatarUrl.startsWith("blob:");

  const { data } = useQuery({
    queryKey: ["avatar-signed-url", avatarUrl],
    queryFn: () => getAvatarUrl(avatarUrl!),
    enabled: !!isPrivate,
    staleTime: 45 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  if (!avatarUrl) return null;
  if (!isPrivate) return avatarUrl;
  return data || null;
}
