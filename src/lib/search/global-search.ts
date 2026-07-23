import { supabase } from "@/integrations/supabase/client";
import type { Employee } from "@/lib/employees/types";

export interface GlobalSearchResult {
  id: string;
  category: "employee" | "document" | "conversation";
  title: string;
  subtitle: string;
  avatarUrl?: string | null;
  email?: string;
  isOnline?: boolean;
  filePath?: string;
  fileSize?: number | null;
  fileMime?: string | null;
  department?: string;
  conversationId?: string;
  employeeData?: Employee;
}

export interface GlobalSearchResults {
  employees: GlobalSearchResult[];
  documents: GlobalSearchResult[];
  conversations: GlobalSearchResult[];
}

export async function performGlobalSearch(
  currentUserId: string,
  query: string,
): Promise<GlobalSearchResults> {
  const searchTerm = query.trim();
  if (!searchTerm || searchTerm.length < 2) {
    return { employees: [], documents: [], conversations: [] };
  }

  const term = `%${searchTerm.replace(/[%_]/g, "\\$&")}%`;

  const [profilesRes, docsRes, msgsRes] = await Promise.all([
    // Search Employees / Profiles
    supabase
      .from("profiles")
      .select("*")
      .or(
        `full_name.ilike.${term},email.ilike.${term},department.ilike.${term},designation.ilike.${term}`,
      )
      .limit(6),

    // Search Department Documents
    supabase
      .from("department_documents")
      .select("*")
      .or(`file_name.ilike.${term},department.ilike.${term}`)
      .limit(6),

    // Search Messages / Conversations
    supabase
      .from("messages")
      .select("id, conversation_id, content, created_at, sender_id")
      .is("deleted_at", null)
      .ilike("content", term)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  // Fetch roles specifically for the matching profiles
  const profileIds = (profilesRes.data ?? []).map((p) => p.id);
  const roleMap = new Map<string, string>();
  if (profileIds.length > 0) {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", profileIds);

    (roles ?? []).forEach((r) => {
      roleMap.set(r.user_id, r.role);
    });
  }

  // Format Employees
  const employees: GlobalSearchResult[] = (profilesRes.data ?? []).map((p) => {
    const role = roleMap.get(p.id) ?? "employee";
    const employeeData: Employee = {
      id: p.id,
      fullName: p.full_name,
      full_name: p.full_name,
      email: p.email,
      avatar: p.avatar_url,
      avatar_url: p.avatar_url,
      department: p.department,
      role,
      jobTitle: p.designation,
      job_title: p.designation,
      designation: p.designation,
      onlineStatus: p.is_online,
      is_online: p.is_online,
    };

    return {
      id: p.id,
      category: "employee",
      title: p.full_name || p.email,
      subtitle: `${p.designation || "Employee"}${p.department ? ` • ${p.department}` : ""}`,
      avatarUrl: p.avatar_url,
      email: p.email,
      isOnline: p.is_online,
      employeeData,
    };
  });

  // Format Documents
  const documents: GlobalSearchResult[] = (docsRes.data ?? []).map((d) => ({
    id: d.id,
    category: "document",
    title: d.file_name,
    subtitle: `${d.department}${d.file_size ? ` • ${(d.file_size / 1024 / 1024).toFixed(1)} MB` : ""}`,
    filePath: d.file_path,
    fileSize: d.file_size,
    fileMime: d.file_mime,
    department: d.department,
  }));

  // Format Conversations / Messages
  const conversations: GlobalSearchResult[] = (msgsRes.data ?? []).map((m) => ({
    id: m.id,
    category: "conversation",
    title: m.content
      ? `"${m.content.slice(0, 45)}${m.content.length > 45 ? "..." : ""}"`
      : "Message in chat",
    subtitle: `Matching message in conversation`,
    conversationId: m.conversation_id,
  }));

  return { employees, documents, conversations };
}
