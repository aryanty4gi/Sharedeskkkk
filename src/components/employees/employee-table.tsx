import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmployeeRow, EmployeeCard } from "./employee-row";
import type { Employee } from "@/lib/employees/types";

interface EmployeeTableProps {
  employees: Employee[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  onSelectEmployee?: (employee: Employee) => void;
}

export function EmployeeTable({
  employees,
  total,
  page,
  pageSize,
  onPageChange,
  onSelectEmployee,
}: EmployeeTableProps) {
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(total / pageSize));
  }, [total, pageSize]);

  const fromCount = useMemo(() => {
    if (total === 0) return 0;
    return (page - 1) * pageSize + 1;
  }, [page, pageSize, total]);

  const toCount = useMemo(() => {
    return Math.min(page * pageSize, total);
  }, [page, pageSize, total]);

  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div className="flex flex-col space-y-4">
      {/* Desktop & Tablet Table View */}
      <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[30%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Employee
              </TableHead>
              <TableHead className="w-[20%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Department
              </TableHead>
              <TableHead className="w-[15%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Role
              </TableHead>
              <TableHead className="w-[20%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Job Title
              </TableHead>
              <TableHead className="w-[15%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((emp) => (
              <EmployeeRow key={emp.id} employee={emp} onSelect={onSelectEmployee} />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card List View */}
      <div className="md:hidden space-y-3">
        {employees.map((emp) => (
          <EmployeeCard key={emp.id} employee={emp} onSelect={onSelectEmployee} />
        ))}
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-2">
        <div className="text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{fromCount}</span> to{" "}
          <span className="font-medium text-foreground">{toCount}</span> of{" "}
          <span className="font-medium text-foreground">{total}</span> employees
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={!canGoPrevious}
            className="h-8 gap-1 px-2.5 text-xs"
            aria-label="Go to previous page"
          >
            <ChevronLeft className="size-3.5" />
            <span>Previous</span>
          </Button>

          <span className="text-xs font-medium px-2 text-foreground">
            Page {page} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!canGoNext}
            className="h-8 gap-1 px-2.5 text-xs"
            aria-label="Go to next page"
          >
            <span>Next</span>
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
