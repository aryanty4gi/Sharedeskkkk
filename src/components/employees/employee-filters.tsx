import { FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DepartmentItem } from "@/lib/employees/types";

interface EmployeeFiltersProps {
  selectedDepartment: string;
  onDepartmentChange: (department: string) => void;
  selectedRole: string;
  onRoleChange: (role: string) => void;
  departments: DepartmentItem[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

const ROLE_OPTIONS = [
  { value: "all", label: "All Roles" },
  { value: "super_admin", label: "Super Admin" },
  { value: "hr_admin", label: "HR Admin" },
  { value: "department_head", label: "Department Head" },
  { value: "manager", label: "Manager" },
  { value: "employee", label: "Employee" },
];

export function EmployeeFilters({
  selectedDepartment,
  onDepartmentChange,
  selectedRole,
  onRoleChange,
  departments,
  hasActiveFilters,
  onClearFilters,
}: EmployeeFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* Department Dropdown */}
      <Select
        value={selectedDepartment || "all"}
        onValueChange={(val) => onDepartmentChange(val === "all" ? "" : val)}
      >
        <SelectTrigger className="h-9 w-full sm:w-44 text-sm" aria-label="Filter by department">
          <SelectValue placeholder="All Departments" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Departments</SelectItem>
          {departments.map((dept) => (
            <SelectItem key={dept.id} value={dept.name}>
              {dept.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Role Dropdown */}
      <Select
        value={selectedRole || "all"}
        onValueChange={(val) => onRoleChange(val === "all" ? "" : val)}
      >
        <SelectTrigger className="h-9 w-full sm:w-40 text-sm" aria-label="Filter by role">
          <SelectValue placeholder="All Roles" />
        </SelectTrigger>
        <SelectContent>
          {ROLE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          aria-label="Clear all filters"
        >
          <FilterX className="size-3.5" />
          <span>Reset</span>
        </Button>
      )}
    </div>
  );
}
