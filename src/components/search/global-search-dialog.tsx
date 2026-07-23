import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  MessageSquare,
  Search,
  User,
  Loader2,
  Download,
  ExternalLink,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/chat/user-avatar";
import { EmployeeProfileDrawer } from "@/components/employees/employee-profile-drawer";
import { useCurrentUser } from "@/lib/chat/use-current-user";
import { performGlobalSearch, type GlobalSearchResult } from "@/lib/search/global-search";
import { getFileTypeInfo, downloadDocumentFile } from "@/lib/documents/utils";
import type { Employee } from "@/lib/employees/types";

export function GlobalSearchDialog() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Drawer state for selected employee
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Keyboard shortcut listener (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 300ms Debounced query state
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  // Execute global search query when debouncedQuery changes
  const {
    data: results,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["global-search", user?.id, debouncedQuery],
    queryFn: () => performGlobalSearch(user!.id, debouncedQuery),
    enabled: !!user && debouncedQuery.trim().length >= 2,
  });

  if (!user) return null;

  const handleSelectResult = async (item: GlobalSearchResult) => {
    setOpen(false);

    if (item.category === "employee" && item.employeeData) {
      setSelectedEmployee(item.employeeData);
      setDrawerOpen(true);
    } else if (item.category === "document") {
      if (item.filePath) {
        try {
          await downloadDocumentFile(item.filePath, item.title);
          toast.success(`Downloaded ${item.title}`);
        } catch {
          navigate({ to: "/documents" });
        }
      } else {
        navigate({ to: "/documents" });
      }
    } else if (item.category === "conversation" && item.conversationId) {
      navigate({
        to: "/chat/$conversationId",
        params: { conversationId: item.conversationId },
      });
    }
  };

  const hasSearch = debouncedQuery.trim().length >= 2;
  const employees = results?.employees ?? [];
  const documents = results?.documents ?? [];
  const conversations = results?.conversations ?? [];
  const totalResults = employees.length + documents.length + conversations.length;

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search employees, documents, messages... (Press Esc to close)"
        />

        <CommandList className="max-h-[420px] scrollbar-thin">
          {/* Initial Instructions */}
          {!hasSearch && !isLoading && (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
              <div className="flex justify-center mb-2">
                <Sparkles className="size-8 text-primary/60" />
              </div>
              <p className="font-semibold text-sm text-foreground">Global Enterprise Search</p>
              <p>Type at least 2 characters to search across employees, documents, and messages.</p>
              <div className="pt-2 flex justify-center gap-2 text-[11px]">
                <kbd className="px-2 py-0.5 rounded bg-muted border font-mono">↑</kbd>
                <kbd className="px-2 py-0.5 rounded bg-muted border font-mono">↓</kbd>
                <span>to navigate</span>
                <kbd className="px-2 py-0.5 rounded bg-muted border font-mono">↵</kbd>
                <span>to select</span>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center p-8 text-xs text-muted-foreground gap-2">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span>Searching across workspace...</span>
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="p-6 text-center text-xs text-destructive">
              {error instanceof Error ? error.message : "Failed to execute global search."}
            </div>
          )}

          {/* Empty State */}
          {hasSearch && !isLoading && !isError && totalResults === 0 && (
            <CommandEmpty className="p-8 text-center text-xs text-muted-foreground">
              No results found matching "{debouncedQuery}".
            </CommandEmpty>
          )}

          {/* Category Group 1: Employees */}
          {hasSearch && employees.length > 0 && (
            <CommandGroup heading="Employees">
              {employees.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`employee-${item.id}-${item.title}`}
                  onSelect={() => handleSelectResult(item)}
                  className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <UserAvatar
                      profile={{
                        id: item.id,
                        email: item.email || "",
                        full_name: item.title,
                        avatar_url: item.avatarUrl || null,
                        is_online: item.isOnline || false,
                      }}
                      size="sm"
                      showStatus
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">
                        {item.title}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {item.subtitle}
                      </span>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className="text-[10px] shrink-0 gap-1 text-muted-foreground"
                  >
                    <User className="size-3" />
                    <span>View Profile</span>
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Category Group 2: Documents */}
          {hasSearch && documents.length > 0 && (
            <CommandGroup heading="Documents">
              {documents.map((item) => {
                const typeInfo = getFileTypeInfo(item.title, item.fileMime || null);
                const IconComponent = typeInfo.icon;
                return (
                  <CommandItem
                    key={item.id}
                    value={`document-${item.id}-${item.title}`}
                    onSelect={() => handleSelectResult(item)}
                    className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <IconComponent className="size-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-foreground truncate">
                          {item.title}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {item.subtitle}
                        </span>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className="text-[10px] shrink-0 gap-1 text-muted-foreground"
                    >
                      <Download className="size-3" />
                      <span>Download</span>
                    </Badge>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {/* Category Group 3: Conversations */}
          {hasSearch && conversations.length > 0 && (
            <CommandGroup heading="Conversations">
              {conversations.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`conversation-${item.id}-${item.title}`}
                  onSelect={() => handleSelectResult(item)}
                  className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                      <MessageSquare className="size-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">
                        {item.title}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {item.subtitle}
                      </span>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className="text-[10px] shrink-0 gap-1 text-muted-foreground"
                  >
                    <ArrowRight className="size-3" />
                    <span>Open Chat</span>
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>

      {/* Profile Drawer for Employee Selection */}
      <EmployeeProfileDrawer
        employee={selectedEmployee}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </>
  );
}
