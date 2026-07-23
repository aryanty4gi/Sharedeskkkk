import { supabase } from "@/integrations/supabase/client";

import type {
  RecentEmployeeActivity,
  RecentDocumentActivity,
  RecentChatActivity,
} from "@/components/admin/admin-recent-activity";

export interface AdminDashboardMetrics {
  totalEmployees: number;
  activeUsers: number;
  totalDepartments: number;
  totalDocuments: number;
  storageUsedBytes: number;
  aiQueriesCount: number;
  newEmployees: RecentEmployeeActivity[];
  recentDocuments: RecentDocumentActivity[];
  recentChats: RecentChatActivity[];
  docsByDepartment: { department: string; count: number }[];
  employeesByDepartment: { department: string; count: number }[];
  employeesByRole: { role: string; count: number }[];
}

export async function fetchAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  const [profilesRes, deptsRes, docsRes, msgsRes, rolesRes] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("departments").select("*").order("name", { ascending: true }),
    supabase.from("department_documents").select("*").order("created_at", { ascending: false }),
    supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(10),
    supabase.from("user_roles").select("user_id, role"),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (deptsRes.error) throw deptsRes.error;
  if (docsRes.error) throw docsRes.error;

  const profiles = profilesRes.data ?? [];
  const departments = deptsRes.data ?? [];
  const documents = docsRes.data ?? [];
  const messages = msgsRes.data ?? [];
  const roles = rolesRes.data ?? [];

  const roleMap = new Map<string, string>();
  roles.forEach((r) => roleMap.set(r.user_id, r.role));

  const profileMap = new Map<string, (typeof profiles)[number]>();
  profiles.forEach((p) => profileMap.set(p.id, p));

  // Storage calculation
  const storageUsedBytes = documents.reduce((acc, d) => acc + (d.file_size || 0), 0);

  // Group Documents by Department
  const docDeptCounts = new Map<string, number>();
  documents.forEach((d) => {
    const dept = d.department || "Other";
    docDeptCounts.set(dept, (docDeptCounts.get(dept) || 0) + 1);
  });

  const docsByDepartment = Array.from(docDeptCounts.entries()).map(([department, count]) => ({
    department,
    count,
  }));

  // Group Employees by Department
  const empDeptCounts = new Map<string, number>();
  profiles.forEach((p) => {
    const dept = p.department || "Unassigned";
    empDeptCounts.set(dept, (empDeptCounts.get(dept) || 0) + 1);
  });

  const employeesByDepartment = Array.from(empDeptCounts.entries()).map(([department, count]) => ({
    department,
    count,
  }));

  // Group Employees by Role
  const empRoleCounts = new Map<string, number>();
  profiles.forEach((p) => {
    const r = roleMap.get(p.id) || "employee";
    empRoleCounts.set(r, (empRoleCounts.get(r) || 0) + 1);
  });

  const employeesByRole = Array.from(empRoleCounts.entries()).map(([role, count]) => ({
    role,
    count,
  }));

  // Enrich recent chats with sender profile info
  const recentChats = messages.slice(0, 5).map((m) => ({
    ...m,
    sender: profileMap.get(m.sender_id) || { full_name: "Unknown", email: "unknown" },
  }));

  return {
    totalEmployees: profiles.length,
    activeUsers: profiles.filter((p) => p.is_online).length,
    totalDepartments: departments.length,
    totalDocuments: documents.length,
    storageUsedBytes,
    aiQueriesCount: 1248, // Enterprise AI queries count placeholder
    newEmployees: profiles.slice(0, 5),
    recentDocuments: documents.slice(0, 5),
    recentChats,
    docsByDepartment,
    employeesByDepartment,
    employeesByRole,
  };
}

export async function createDepartmentInDb(data: {
  name: string;
  code: string;
  description?: string;
}) {
  const { error } = await supabase.from("departments").insert({
    name: data.name.trim(),
    code: data.code.trim().toUpperCase(),
    description: data.description?.trim() || null,
  });

  if (error) throw error;
}

export async function addEmployeeProfileInDb(data: {
  email: string;
  fullName: string;
  department: string;
  designation: string;
  role: string;
}) {
  // Generate random UUID for profile row
  const id = crypto.randomUUID();

  const { error: profileError } = await supabase.from("profiles").insert({
    id,
    email: data.email.trim(),
    full_name: data.fullName.trim(),
    department: data.department.trim(),
    designation: data.designation.trim(),
    is_online: false,
  });

  if (profileError) throw profileError;

  const { error: roleError } = await supabase.from("user_roles").insert({
    user_id: id,
    role: data.role,
  });

  if (roleError) console.warn("Failed to set user role:", roleError);
}
