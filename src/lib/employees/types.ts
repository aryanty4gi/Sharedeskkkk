export type CompanyRole =
  | "super_admin"
  | "hr_admin"
  | "department_head"
  | "manager"
  | "employee"
  | string;

export interface Employee {
  id: string;
  fullName: string | null;
  full_name?: string | null;
  email: string;
  avatar: string | null;
  avatar_url?: string | null;
  department: string | null;
  role: string;
  jobTitle: string | null;
  job_title?: string | null;
  designation?: string | null;
  onlineStatus: boolean | null;
  is_online?: boolean | null;
}

export interface EmployeeFilters {
  search?: string;
  department?: string;
  role?: string;
  page?: number;
  pageSize?: number;
}

export interface GetEmployeesInput extends EmployeeFilters {
  token?: string;
}

export interface GetEmployeesResponse {
  employees: Employee[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DepartmentItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
}
