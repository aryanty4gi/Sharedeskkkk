import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  FolderOpen,
  FileText,
  Download,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/chat/user-avatar";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { useCurrentUser } from "@/lib/chat/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  adminFetchAllFilesAction,
  adminCreateSignedUrlAction,
} from "@/lib/chat/admin-files.functions";
import {
  adminDeleteUser,
  adminUpdateEmployee,
  adminUpdateUserRole,
  fetchAdminUsers,
  fetchCurrentUserRole,
  type AdminUser,
  type CompanyRole,
} from "@/lib/chat/queries";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

const ROLES: CompanyRole[] = [
  "super_admin",
  "hr_admin",
  "department_head",
  "manager",
  "employee",
];

function AdminPage() {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "files">("users");

  const { data: myRole, isLoading: roleLoading } = useQuery({
    queryKey: ["current-role", user?.id],
    queryFn: () => fetchCurrentUserRole(user!.id),
    enabled: Boolean(user?.id),
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchAdminUsers,
    enabled: myRole === "super_admin" || myRole === "hr_admin",
  });

  const filtered = users.filter((employee) => {
    const value = [
      employee.full_name,
      employee.email,
      employee.employee_id,
      employee.department,
      employee.designation,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return value.includes(search.toLowerCase());
  });

  if (roleLoading) {
    return <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">Checking administrator access...</div>;
  }

  if (myRole !== "super_admin" && myRole !== "hr_admin") {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-8 text-center">
        <ShieldCheck className="size-12 text-destructive" />
        <h1 className="mt-5 text-2xl font-bold">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Administrator permissions are required to access this area.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Return to ShareDesk</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid h-screen w-screen grid-cols-1 md:grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr]">
      <div className="hidden min-h-0 md:block">
        <ChatSidebar userId={user!.id} />
      </div>

      <main className="flex min-h-0 min-w-0 flex-col bg-background">
      <header className="shrink-0 border-b border-border bg-card">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button asChild variant="outline" size="sm" className="h-9 px-2.5 sm:px-3">
              <Link to="/">
                <ArrowLeft className="mr-1.5 size-4" />
                <span>Back<span className="hidden sm:inline"> to Workspace</span></span>
              </Link>
            </Button>

            <div className="hidden sm:block h-6 w-[1px] bg-border" />

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold tracking-tight">Admin Console</h1>
                <p className="hidden sm:block text-[10px] text-muted-foreground">ShareDesk Workplace Management</p>
              </div>
            </div>
          </div>

          <div className="rounded-full border border-primary/20 bg-primary/10 px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold text-primary">
            {myRole === "super_admin" ? "Super Admin" : "HR Admin"}
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {/* Tabs for Super Admin */}
        {myRole === "super_admin" && (
          <div className="mb-6 flex border-b border-border">
            <button
              onClick={() => setActiveTab("users")}
              className={cn(
                "pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors cursor-pointer",
                activeTab === "users"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Manage Users
            </button>
            <button
              onClick={() => setActiveTab("files")}
              className={cn(
                "pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors cursor-pointer",
                activeTab === "files"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Department Files
            </button>
          </div>
        )}

        {activeTab === "files" && myRole === "super_admin" ? (
          <DepartmentFilesView />
        ) : (
          <>
            <div className="mb-6 flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="size-5 text-primary" />
                  <h2 className="text-2xl font-bold tracking-tight">Manage Users</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage employee departments, designations, managers and company roles.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total employees</p>
                <p className="mt-1 text-2xl font-bold">{users.length}</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
              <section className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="border-b border-border p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search name, email, employee ID or department..."
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
                  {isLoading ? (
                    <p className="p-8 text-center text-sm text-muted-foreground">Loading employees...</p>
                  ) : (
                    filtered.map((employee) => (
                      <button
                        key={employee.id}
                        onClick={() => setSelected(employee)}
                        className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/60"
                      >
                        <UserAvatar profile={employee} showStatus />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {employee.full_name || employee.email}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {employee.designation || "No designation"} · {employee.department || "No department"}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-mono text-[10px] font-semibold text-primary">
                            {employee.employee_id || "NO ID"}
                          </p>
                          <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {employee.role.replaceAll("_", " ")}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </section>

              <EmployeeEditor
                employee={selected}
                users={users}
                canManageRoles={myRole === "super_admin"}
                currentUserId={user!.id}
                onSaved={() => {
                  qc.invalidateQueries({ queryKey: ["admin-users"] });
                  qc.invalidateQueries({ queryKey: ["directory"] });
                }}
              />
            </div>
          </>
        )}
      </div>
      </main>
    </div>
  );
}

function EmployeeEditor({
  employee,
  users,
  canManageRoles,
  currentUserId,
  onSaved,
}: {
  employee: AdminUser | null;
  users: AdminUser[];
  canManageRoles: boolean;
  currentUserId: string;
  onSaved: () => void;
}) {
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [managerId, setManagerId] = useState("");
  const [role, setRole] = useState<CompanyRole>("employee");
  const [message, setMessage] = useState("");

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!employee) return;

      await adminUpdateEmployee({
        targetUserId: employee.id,
        department,
        designation,
        managerId: managerId || null,
      });

      if (canManageRoles && role !== employee.role) {
        await adminUpdateUserRole(employee.id, role);
      }
    },
    onSuccess: () => {
      setMessage("Employee updated successfully.");
      onSaved();
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "Unable to update employee.");
    },
  });


  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!employee) return;

      const employeeName = employee.full_name || employee.email;

      const confirmed = window.confirm(
        `Permanently delete ${employeeName} (${employee.email})?

This will remove the employee account from ShareDesk and cannot be undone.`
      );

      if (!confirmed) return;

      await adminDeleteUser(employee.id);
    },
    onSuccess: () => {
      setMessage("Employee deleted successfully.");
      onSaved();
    },
    onError: (error) => {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete employee."
      );
    },
  });
  useEffect(() => {
    if (!employee) return;

    setDepartment(employee.department ?? "");
    setDesignation(employee.designation ?? "");
    setManagerId(employee.manager_id ?? "");
    setRole(employee.role);
    setMessage("");
  }, [employee]);

  if (!employee) {
    return (
      <aside className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <div>
          <Users className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-4 text-sm font-semibold">Select an employee</p>
          <p className="mt-1 text-xs text-muted-foreground">Employee management details will appear here.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="flex items-center gap-3 border-b border-border pb-5">
        <UserAvatar profile={employee} showStatus size="lg" />
        <div className="min-w-0">
          <h3 className="truncate font-bold">{employee.full_name || employee.email}</h3>
          <p className="truncate text-xs text-muted-foreground">{employee.email}</p>
          <p className="mt-1 font-mono text-[10px] font-semibold text-primary">{employee.employee_id}</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <Field label="Department">
          <Input value={department} onChange={(event) => setDepartment(event.target.value)} />
        </Field>

        <Field label="Designation">
          <Input value={designation} onChange={(event) => setDesignation(event.target.value)} />
        </Field>

        <Field label="Manager">
          <select
            value={managerId}
            onChange={(event) => setManagerId(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">No manager</option>
            {users
              .filter((user) => user.id !== employee.id)
              .map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
          </select>
        </Field>

        <Field label="Company role">
          <select
            value={role}
            disabled={!canManageRoles}
            onChange={(event) => setRole(event.target.value as CompanyRole)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {ROLES.map((item) => (
              <option key={item} value={item}>
                {item.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </Field>

        {message && <p className="text-xs text-muted-foreground">{message}</p>}

        <Button
          className="w-full"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || deleteMutation.isPending}
        >
          <Save className="mr-2 size-4" />
          {saveMutation.isPending ? "Saving..." : "Save employee"}
        </Button>

        {canManageRoles && employee.id !== currentUserId && (
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending || saveMutation.isPending}
          >
            <Trash2 className="mr-2 size-4" />
            {deleteMutation.isPending
              ? "Deleting..."
              : "Delete employee"}
          </Button>
        )}
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

interface FileDocument {
  id: string;
  department: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_mime: string | null;
  created_at: string;
  uploaded_by: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
}

function DepartmentFilesView() {
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  // Fetch all files
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-all-files"],
    queryFn: async () => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("No session found");
      const res = await adminFetchAllFilesAction({
        data: { accessToken: token }
      });
      if ("error" in res) throw new Error(res.error);
      return (res.documents as unknown as FileDocument[]) ?? [];
    },
  });

  // Extract distinct departments from files
  const departments = Array.from(new Set(data?.map(d => d.department).filter(Boolean) || []));

  // Filtered & sorted files
  const filtered = (data ?? [])
    .filter((doc) => {
      const matchesSearch = doc.file_name.toLowerCase().includes(search.toLowerCase());
      const matchesDept = selectedDept === "all" || doc.department === selectedDept;
      return matchesSearch && matchesDept;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

  const handleDownload = async (filePath: string, fileName: string, docId: string) => {
    setDownloadingFileId(docId);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("No active session found");

      const res = await adminCreateSignedUrlAction({
        data: { accessToken: token, filePath }
      });
      if ("error" in res) throw new Error(res.error);
      if (!res.signedUrl) throw new Error("Signed URL was not returned");

      // Trigger download
      const anchor = document.createElement("a");
      anchor.href = res.signedUrl;
      anchor.download = fileName;
      anchor.target = "_blank"; // Support inline preview if browser supports
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (err) {
      console.error("DOWNLOAD ERROR:", err);
      alert(err instanceof Error ? err.message : "Failed to download file");
    } finally {
      setDownloadingFileId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FolderOpen className="size-5 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight">Department Files</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Securely search, filter, and access all department-shared files.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9 cursor-pointer">
            <RefreshCw className="mr-1.5 size-3.5" />
            Reload
          </Button>

          <div className="rounded-xl border border-border bg-card px-4 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total files</p>
            <p className="mt-0.5 text-xl font-bold">{filtered.length}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by file name..."
            className="pl-9"
          />
        </div>

        {/* Filter Department */}
        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm min-w-[160px] cursor-pointer"
        >
          <option value="all">All Departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>

        {/* Sort Order */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "newest" | "oldest")}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm min-w-[140px] cursor-pointer"
        >
          <option value="newest">Newest Uploads</option>
          <option value="oldest">Oldest Uploads</option>
        </select>
      </div>

      {/* Files List */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Loader2 className="size-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Loading files...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-destructive">
            Error loading files: {error.message}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <FileText className="size-10 text-muted-foreground mb-3" />
            <p className="font-semibold text-sm">No files found</p>
            <p className="text-xs text-muted-foreground mt-0.5">Try adjusting your search query or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                  <th className="p-4">File Name</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Uploaded By</th>
                  <th className="p-4">File Size</th>
                  <th className="p-4">Upload Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((doc) => {
                  const sizeMB = doc.file_size
                    ? `${(doc.file_size / 1024 / 1024).toFixed(2)} MB`
                    : "Unknown";
                  const dateStr = new Date(doc.created_at).toLocaleString();
                  const uploader = doc.profiles?.full_name || doc.profiles?.email || "Unknown";
                  
                  return (
                    <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium text-foreground max-w-[240px] truncate">
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 shrink-0 text-primary/70" />
                          <span title={doc.file_name}>{doc.file_name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{doc.department}</td>
                      <td className="p-4 text-muted-foreground truncate max-w-[180px]" title={uploader}>
                        {uploader}
                      </td>
                      <td className="p-4 text-muted-foreground">{sizeMB}</td>
                      <td className="p-4 text-muted-foreground text-xs">{dateStr}</td>
                      <td className="p-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 cursor-pointer"
                          disabled={downloadingFileId === doc.id}
                          onClick={() => handleDownload(doc.file_path, doc.file_name, doc.id)}
                        >
                          {downloadingFileId === doc.id ? (
                            <Loader2 className="size-3.5 animate-spin mr-1.5" />
                          ) : (
                            <Download className="size-3.5 mr-1.5" />
                          )}
                          Download
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}