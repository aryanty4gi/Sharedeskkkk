import { Search, X, LayoutGrid, List, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DocumentSortBy, DocumentSortOrder, ViewMode } from "@/lib/documents/types";

interface DocumentSearchSortProps {
  search: string;
  onSearchChange: (val: string) => void;
  sortBy: DocumentSortBy;
  onSortByChange: (val: DocumentSortBy) => void;
  sortOrder: DocumentSortOrder;
  onToggleSortOrder: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function DocumentSearchSort({
  search,
  onSearchChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onToggleSortOrder,
  viewMode,
  onViewModeChange,
}: DocumentSearchSortProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
      {/* Search Input */}
      <div className="relative flex-1 min-w-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search documents by name, department, owner..."
          className="h-9 pl-9 pr-8 text-sm border-border bg-background"
          aria-label="Search documents"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Controls Group: Sort & View Mode */}
      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
        {/* Sort Field Select */}
        <div className="flex items-center gap-1">
          <Select value={sortBy} onValueChange={(val) => onSortByChange(val as DocumentSortBy)}>
            <SelectTrigger className="h-9 w-32 text-xs" aria-label="Sort documents by">
              <ArrowUpDown className="mr-1 size-3.5 text-muted-foreground" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="size">Size</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Direction Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={onToggleSortOrder}
            className="size-9 shrink-0"
            title={`Sort ${sortOrder === "asc" ? "Ascending" : "Descending"}`}
            aria-label={`Toggle sort order, currently ${sortOrder}`}
          >
            {sortOrder === "asc" ? (
              <ArrowUp className="size-4" />
            ) : (
              <ArrowDown className="size-4" />
            )}
          </Button>
        </div>

        {/* Grid vs List View Mode Toggle */}
        <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => onViewModeChange("grid")}
            className="size-8"
            title="Grid view"
            aria-label="Grid view"
          >
            <LayoutGrid className="size-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => onViewModeChange("list")}
            className="size-8"
            title="List view"
            aria-label="List view"
          >
            <List className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
