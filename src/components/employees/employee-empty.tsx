import { Users, FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmployeeEmptyProps {
  onClearFilters: () => void;
  hasActiveFilters?: boolean;
}

export function EmployeeEmpty({ onClearFilters, hasActiveFilters = true }: EmployeeEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-8 text-center my-6 min-h-[320px]">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
        <Users className="size-7" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">No employees found</h3>
      <p className="max-w-md text-sm text-muted-foreground mb-6">
        We couldn't find any employees matching your current search or filter criteria. Try
        adjusting your filters or search keywords.
      </p>
      {hasActiveFilters && (
        <Button variant="outline" onClick={onClearFilters} className="gap-2 text-sm font-medium">
          <FilterX className="size-4" />
          <span>Clear all filters</span>
        </Button>
      )}
    </div>
  );
}
