import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const DOCUMENT_BUCKET = "department-documents";

export async function downloadDepartmentDocument(filePath: string): Promise<ArrayBuffer> {
  const { data, error } = await supabaseAdmin.storage.from(DOCUMENT_BUCKET).download(filePath);

  if (error) {
    throw new Error(`Failed to download document from storage: ${error.message}`);
  }

  return await data.arrayBuffer();
}
