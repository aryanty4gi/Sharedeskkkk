import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useCallback } from "react";
import { AlertCircle, RefreshCw, Users } from "lucide-react";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { Button } from "@/components/ui/button";
import { EmployeeSearch } from "@/components/employees/employee-search";
import { EmployeeFilters } from "@/components/employees/employee-filters";
import { EmployeeTable } from "@/components/employees/employee-table";
import { EmployeeEmpty } from "@/components/employees/employee-empty";
import { EmployeeLoading } from "@/components/employees/employee-loading";
import { EmployeeProfileDrawer } from "@/components/employees/employee-profile-drawer";
import { useCurrentUser } from "@/lib/chat/use-current-user";
import { getEmployees, getDepartments } from "@/lib/employees/queries";
import type { Employee } from "@/lib/employees/types";

export const Route = createFileRoute("/_authenticated/employees")({
  component: EmployeeDirectoryPage,
});

function EmployeeDirectoryPage() {
  const { user } = useCurrentUser();

  // Filter and pagination state
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Selected employee state for Profile Drawer
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Query departments list for filter dropdown
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: getDepartments,
    enabled: !!user,
  });

  // Main employees directory query
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["employees-directory", search, department, role, page, pageSize],
    queryFn: () =>
      getEmployees({
        search,
        department,
        role,
        page,
        pageSize,
      }),
    enabled: !!user,
  });

  const hasActiveFilters = useMemo(() => {
    return Boolean(search.trim() || department || role);
  }, [search, department, role]);

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
  }, []);

  const handleDepartmentChange = useCallback((val: string) => {
    setDepartment(val);
    setPage(1);
  }, []);

  const handleRoleChange = useCallback((val: string) => {
    setRole(val);
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setDepartment("");
    setRole("");
    setPage(1);
  }, []);

  const handleSelectEmployee = useCallback((emp: Employee) => {
    setSelectedEmployee(emp);
    setDrawerOpen(true);
  }, []);

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar navigation */}
      <div className="hidden lg:block w-80 shrink-0 border-r border-border">
        <ChatSidebar userId={user.id} />
      </div>

      {/* Main content area */}
      <main className="flex flex-1 flex-col overflow-y-auto scrollbar-thin">
        {/* Header bar */}
        <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="size-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  Employee Directory
                </h1>
                <p className="text-xs text-muted-foreground">
                  Browse and search company team members across departments.
                </p>
              </div>
            </div>

            {data?.total !== undefined && (
              <span className="self-start sm:self-center inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground border border-border">
                {data.total} {data.total === 1 ? "Employee" : "Employees"}
              </span>
            )}
          </div>
        </header>

        {/* Directory Controls & Content Container */}
        <div className="p-6 space-y-6 max-w-7xl w-full mx-auto">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
            <EmployeeSearch
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by name or email..."
            />

            <EmployeeFilters
              selectedDepartment={department}
              onDepartmentChange={handleDepartmentChange}
              selectedRole={role}
              onRoleChange={handleRoleChange}
              departments={departments}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={handleClearFilters}
            />
          </div>

          {/* Directory Data Display States */}
          {isLoading ? (
            <EmployeeLoading rowsCount={pageSize} />
          ) : isError ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center my-6">
              <AlertCircle className="size-10 text-destructive mb-3" />
              <h3 className="text-base font-semibold text-foreground mb-1">
                Failed to load employees
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mb-4">
                {error instanceof Error
                  ? error.message
                  : "An unexpected server error occurred while retrieving employee directory data."}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="gap-2 text-xs"
              >
                <RefreshCw className="size-3.5" />
                <span>Try again</span>
              </Button>
            </div>
          ) : !data || data.employees.length === 0 ? (
            <EmployeeEmpty
              onClearFilters={handleClearFilters}
              hasActiveFilters={hasActiveFilters}
            />
          ) : (
            <EmployeeTable
              employees={data.employees}
              total={data.total}
              page={data.page}
              pageSize={data.pageSize}
              onPageChange={setPage}
              onSelectEmployee={handleSelectEmployee}
            />
          )}
        </div>
      </main>

      {/* Employee Profile Drawer */}
      <EmployeeProfileDrawer
        employee={selectedEmployee}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
