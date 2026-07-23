import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAuthenticatedClient } from "@/lib/auth/server-auth";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Employee, GetEmployeesResponse, DepartmentItem } from "./types";

const getEmployeesInputSchema = z.object({
  token: z.string().min(1, "Access token is required"),
  search: z.string().optional(),
  department: z.string().optional(),
  role: z.string().optional(),
  page: z.number().int().min(1).optional().default(1),
  pageSize: z.number().int().min(1).max(100).optional().default(10),
});

export const getEmployeesAction = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => getEmployeesInputSchema.parse(d))
  .handler(async ({ data }): Promise<GetEmployeesResponse> => {
    // Authenticate user via token to enforce RLS and session validity
    const supabaseClient = await getAuthenticatedClient(data.token);

    // 1. Fetch departments to resolve codes or ids to department names
    const { data: deptRows } = await supabaseClient.from("departments").select("id, code, name");

    const deptMap = new Map<string, string>();
    (deptRows ?? []).forEach((d) => {
      deptMap.set(d.id, d.name);
      deptMap.set(d.code, d.name);
      deptMap.set(d.name.toLowerCase(), d.name);
    });

    // 2. Optional role filter handling
    let allowedUserIds: string[] | null = null;
    if (data.role && data.role.trim()) {
      const { data: roleRows, error: roleError } = await supabaseClient
        .from("user_roles")
        .select("user_id")
        .eq("role", data.role.trim());

      if (roleError) throw roleError;
      allowedUserIds = (roleRows ?? []).map((r) => r.user_id);
    }

    // 3. Build profiles query with count for total pagination calculation
    let query = supabaseClient.from("profiles").select("*", { count: "exact" });

    // Optional search filter: name or email
    if (data.search && data.search.trim()) {
      const searchVal = `%${data.search.trim()}%`;
      query = query.or(`full_name.ilike.${searchVal},email.ilike.${searchVal}`);
    }

    // Optional department filter
    if (data.department && data.department.trim()) {
      const deptTerm = data.department.trim();
      query = query.ilike("department", `%${deptTerm}%`);
    }

    // Optional role filter (match user_ids)
    if (allowedUserIds !== null) {
      if (allowedUserIds.length === 0) {
        return {
          employees: [],
          total: 0,
          page: data.page,
          pageSize: data.pageSize,
        };
      }
      query = query.in("id", allowedUserIds);
    }

    // Order by full_name
    query = query.order("full_name", { ascending: true, nullsFirst: false });

    // Pagination calculations
    const page = Math.max(1, data.page);
    const pageSize = Math.max(1, data.pageSize);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.range(from, to);

    const { data: profiles, count, error: profilesError } = await query;
    if (profilesError) throw profilesError;

    const profileIds = (profiles ?? []).map((p) => p.id);

    // Fetch user roles for the matching profiles
    const roleMap = new Map<string, string>();
    if (profileIds.length > 0) {
      const { data: roles, error: rolesError } = await supabaseClient
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", profileIds);

      if (!rolesError && roles) {
        roles.forEach((r) => {
          roleMap.set(r.user_id, r.role);
        });
      }
    }

    // Map profiles into typed Employee objects
    const employees: Employee[] = (profiles ?? []).map((p) => {
      const deptRaw = p.department?.trim() ?? null;
      let resolvedDept = deptRaw;
      if (deptRaw) {
        resolvedDept = deptMap.get(deptRaw) ?? deptMap.get(deptRaw.toLowerCase()) ?? deptRaw;
      }

      const userRole = roleMap.get(p.id) ?? "employee";

      return {
        id: p.id,
        fullName: p.full_name,
        full_name: p.full_name,
        email: p.email,
        avatar: p.avatar_url,
        avatar_url: p.avatar_url,
        department: resolvedDept,
        role: userRole,
        jobTitle: p.designation,
        job_title: p.designation,
        designation: p.designation,
        onlineStatus: p.is_online ?? null,
        is_online: p.is_online ?? null,
      };
    });

    return {
      employees,
      total: count ?? employees.length,
      page,
      pageSize,
    };
  });

export const getDepartmentsAction = createServerFn({ method: "GET" }).handler(
  async (): Promise<DepartmentItem[]> => {
    const { data, error } = await supabaseAdmin
      .from("departments")
      .select("id, code, name, description")
      .order("name", { ascending: true });

    if (error) throw error;
    return (data ?? []) as DepartmentItem[];
  },
);
