import { memo, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { UserAvatar } from "@/components/chat/user-avatar";
import type { Employee } from "@/lib/employees/types";
import { cn } from "@/lib/utils";

interface EmployeeRowProps {
  employee: Employee;
  onSelect?: (employee: Employee) => void;
}

function formatRoleLabel(role: string): string {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "hr_admin":
      return "HR Admin";
    case "department_head":
      return "Dept Head";
    case "manager":
      return "Manager";
    case "employee":
      return "Employee";
    default:
      return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function getRoleBadgeVariant(role: string) {
  switch (role) {
    case "super_admin":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    case "hr_admin":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
    case "department_head":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "manager":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    default:
      return "bg-secondary text-secondary-foreground border-transparent";
  }
}

export const EmployeeRow = memo(function EmployeeRow({ employee, onSelect }: EmployeeRowProps) {
  const profileAdapter = useMemo(
    () => ({
      id: employee.id,
      email: employee.email,
      full_name: employee.fullName ?? employee.full_name ?? null,
      avatar_url: employee.avatar ?? employee.avatar_url ?? null,
      is_online: employee.onlineStatus ?? employee.is_online ?? false,
    }),
    [
      employee.id,
      employee.email,
      employee.fullName,
      employee.full_name,
      employee.avatar,
      employee.avatar_url,
      employee.onlineStatus,
      employee.is_online,
    ],
  );

  const displayName = employee.fullName || employee.full_name || "Unnamed Employee";
  const displayTitle = employee.jobTitle || employee.designation || "—";
  const displayDepartment = employee.department || "—";

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && onSelect) {
      e.preventDefault();
      onSelect(employee);
    }
  };

  return (
    <TableRow
      tabIndex={onSelect ? 0 : undefined}
      role={onSelect ? "button" : undefined}
      onClick={() => onSelect?.(employee)}
      onKeyDown={handleKeyDown}
      className={cn(
        "transition-colors",
        onSelect
          ? "cursor-pointer hover:bg-muted/60 focus-visible:bg-muted/80 focus-visible:outline-none"
          : "hover:bg-muted/40",
      )}
    >
      {/* Employee Info: Avatar + Full Name + Email */}
      <TableCell className="font-medium">
        <div className="flex items-center gap-3">
          <UserAvatar
            profile={profileAdapter}
            size="md"
            showStatus={employee.onlineStatus !== null && employee.onlineStatus !== undefined}
          />
          <div className="flex flex-col min-w-0">
            <span className="truncate text-sm font-semibold text-foreground">{displayName}</span>
            <span className="truncate text-xs text-muted-foreground font-mono">
              {employee.email}
            </span>
          </div>
        </div>
      </TableCell>

      {/* Department */}
      <TableCell className="text-sm text-foreground">
        <span className="inline-block max-w-44 truncate">{displayDepartment}</span>
      </TableCell>

      {/* Role */}
      <TableCell>
        <Badge
          variant="outline"
          className={cn(
            "font-medium capitalize text-xs px-2.5 py-0.5 border",
            getRoleBadgeVariant(employee.role),
          )}
        >
          {formatRoleLabel(employee.role)}
        </Badge>
      </TableCell>

      {/* Job Title */}
      <TableCell className="text-sm text-muted-foreground">
        <span className="inline-block max-w-44 truncate">{displayTitle}</span>
      </TableCell>

      {/* Online Status */}
      <TableCell>
        {employee.onlineStatus === null || employee.onlineStatus === undefined ? (
          <Badge variant="secondary" className="text-xs font-normal text-muted-foreground">
            Unknown
          </Badge>
        ) : employee.onlineStatus ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Online
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground border border-border">
            <span className="size-1.5 rounded-full bg-muted-foreground/50" />
            Offline
          </span>
        )}
      </TableCell>
    </TableRow>
  );
});

/**
 * Mobile Card representation for mobile responsiveness
 */
export const EmployeeCard = memo(function EmployeeCard({ employee, onSelect }: EmployeeRowProps) {
  const profileAdapter = {
    id: employee.id,
    email: employee.email,
    full_name: employee.fullName ?? employee.full_name ?? null,
    avatar_url: employee.avatar ?? employee.avatar_url ?? null,
    is_online: employee.onlineStatus ?? employee.is_online ?? false,
  };

  const displayName = employee.fullName || employee.full_name || "Unnamed Employee";
  const displayTitle = employee.jobTitle || employee.designation || "—";
  const displayDepartment = employee.department || "—";

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && onSelect) {
      e.preventDefault();
      onSelect(employee);
    }
  };

  return (
    <div
      tabIndex={onSelect ? 0 : undefined}
      role={onSelect ? "button" : undefined}
      onClick={() => onSelect?.(employee)}
      onKeyDown={handleKeyDown}
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors",
        onSelect
          ? "cursor-pointer hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          : "hover:border-primary/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar
            profile={profileAdapter}
            size="lg"
            showStatus={employee.onlineStatus !== null && employee.onlineStatus !== undefined}
          />
          <div className="flex flex-col min-w-0">
            <h4 className="text-sm font-semibold text-foreground truncate">{displayName}</h4>
            <p className="text-xs text-muted-foreground font-mono truncate">{employee.email}</p>
          </div>
        </div>

        {/* Online Status */}
        {employee.onlineStatus === null || employee.onlineStatus === undefined ? (
          <Badge variant="secondary" className="text-[10px] shrink-0 font-normal">
            Unknown
          </Badge>
        ) : employee.onlineStatus ? (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Online
          </span>
        ) : (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border">
            <span className="size-1.5 rounded-full bg-muted-foreground/50" />
            Offline
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/60">
        <div>
          <span className="text-[11px] font-medium text-muted-foreground block">Department</span>
          <span className="text-foreground font-medium truncate block">{displayDepartment}</span>
        </div>
        <div>
          <span className="text-[11px] font-medium text-muted-foreground block">Role</span>
          <Badge
            variant="outline"
            className={cn(
              "font-medium text-[10px] px-2 py-0 mt-0.5 border inline-block max-w-full truncate",
              getRoleBadgeVariant(employee.role),
            )}
          >
            {formatRoleLabel(employee.role)}
          </Badge>
        </div>
        {displayTitle !== "—" && (
          <div className="col-span-2 pt-1">
            <span className="text-[11px] font-medium text-muted-foreground block">Job Title</span>
            <span className="text-foreground truncate block">{displayTitle}</span>
          </div>
        )}
      </div>
    </div>
  );
});
