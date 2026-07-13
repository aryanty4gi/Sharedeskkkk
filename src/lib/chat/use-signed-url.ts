import { useQuery } from "@tanstack/react-query";
import { getAttachmentUrl } from "./queries";

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
