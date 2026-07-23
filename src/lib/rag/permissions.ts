import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function getDepartmentDocument(documentId: string) {
  const { data, error } = await supabaseAdmin
    .from("department_documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (error || !data) {
    throw new Error("Department document not found.");
  }

  return data;
}
