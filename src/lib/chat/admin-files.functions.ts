import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";

const adminActionSchema = z.object({
  accessToken: z.string().min(1),
});

const adminDownloadActionSchema = z.object({
  accessToken: z.string().min(1),
  filePath: z.string().min(1),
});

async function verifySuperAdmin(token: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const user = await getAuthenticatedUser(token);

  const { data: roleData, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (roleError || !roleData || roleData.role !== "super_admin") {
    throw new Error("Unauthorized: Super Admin privileges required.");
  }

  return user;
}

export const adminFetchAllFilesAction = createServerFn({ method: "POST" })
  .inputValidator((d) => adminActionSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      await verifySuperAdmin(data.accessToken);

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: documents, error } = await supabaseAdmin
        .from("department_documents")
        .select(
          `
          id,
          department,
          file_name,
          file_path,
          file_size,
          file_mime,
          created_at,
          uploaded_by,
          profiles:uploaded_by (
            full_name,
            email
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      return { documents: documents ?? [] };
    } catch (err) {
      console.error("[Admin Files Server] Error fetching all files:", err);
      return { error: err instanceof Error ? err.message : "Failed to fetch files" };
    }
  });

export const adminCreateSignedUrlAction = createServerFn({ method: "POST" })
  .inputValidator((d) => adminDownloadActionSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      await verifySuperAdmin(data.accessToken);

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: signedData, error } = await supabaseAdmin.storage
        .from("department-documents")
        .createSignedUrl(data.filePath, 60);

      if (error) throw error;

      return { signedUrl: signedData.signedUrl };
    } catch (err) {
      console.error("[Admin Files Server] Error generating signed URL:", err);
      return { error: err instanceof Error ? err.message : "Failed to generate signed URL" };
    }
  });
