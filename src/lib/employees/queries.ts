import { supabase } from "@/integrations/supabase/client";
import { getEmployeesAction, getDepartmentsAction } from "./actions";
import type { Employee, GetEmployeesInput, GetEmployeesResponse, DepartmentItem } from "./types";

/**
 * Server query function to fetch paginated and filtered employees directory.
 * Automatically passes the current session token if available and not provided.
 * Supports search, department filter, role filter, and pagination.
 */
export async function getEmployees(input: GetEmployeesInput = {}): Promise<GetEmployeesResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = input.token || session?.access_token;
  if (!token) {
    throw new Error("Unauthorized: Access token is required.");
  }

  return getEmployeesAction({
    data: {
      token,
      search: input.search,
      department: input.department,
      role: input.role,
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 10,
    },
  });
}

/**
 * Server query helper to fetch all available departments.
 */
export async function getDepartments(): Promise<DepartmentItem[]> {
  return getDepartmentsAction();
}

export type { Employee, GetEmployeesInput, GetEmployeesResponse, DepartmentItem };
