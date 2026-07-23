import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface EmployeeSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function EmployeeSearch({
  value,
  onChange,
  placeholder = "Search by name or email...",
}: EmployeeSearchProps) {
  const [searchTerm, setSearchTerm] = useState(value);

  // Sync internal state if parent value changes externally (e.g. on filter clear)
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Debounce search input updates by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm !== value) {
        onChange(searchTerm);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm, onChange, value]);

  return (
    <div className="relative w-full sm:w-72 md:w-80">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={placeholder}
        className="h-9 pl-9 pr-8 text-sm"
        aria-label="Search employees by name or email"
      />
      {searchTerm && (
        <button
          type="button"
          onClick={() => {
            setSearchTerm("");
            onChange("");
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Clear search input"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
