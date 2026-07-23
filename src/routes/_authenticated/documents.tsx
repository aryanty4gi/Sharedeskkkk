import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import {
  AlertCircle,
  Clock,
  FileText,
  FolderOpen,
  Loader2,
  RefreshCw,
  Share2,
  Star,
  Upload,
  UserCheck,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentCard } from "@/components/documents/document-card";
import { DocumentListRow } from "@/components/documents/document-list-row";
import { DocumentSearchSort } from "@/components/documents/document-search-sort";
import { DocumentRenameDialog } from "@/components/documents/document-rename-dialog";
import { DocumentMoveDialog } from "@/components/documents/document-move-dialog";
import { DocumentEmpty } from "@/components/documents/document-empty";
import { DocumentLoading } from "@/components/documents/document-loading";
import { validateFileUpload, sanitizeFileName } from "@/lib/security/file-validation";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/chat/use-current-user";
import { fetchMyProfile } from "@/lib/chat/queries";
import { getDepartments } from "@/lib/employees/queries";
import { ingestDocumentAction } from "@/lib/rag/ingest.functions";
import type {
  EnterpriseDocument,
  DocumentSection,
  DocumentSortBy,
  DocumentSortOrder,
  ViewMode,
} from "@/lib/documents/types";
import {
  fetchEnterpriseDocuments,
  renameDocumentInDb,
  moveDocumentInDb,
  deleteDocumentFromStorageAndDb,
  downloadDocumentFile,
} from "@/lib/documents/utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/documents")({
  component: EnterpriseDocumentsWorkspace,
});

export function EnterpriseDocumentsWorkspace() {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Layout & Navigation State
  const [activeSection, setActiveSection] = useState<DocumentSection>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<DocumentSortBy>("date");
  const [sortOrder, setSortOrder] = useState<DocumentSortOrder>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [uploading, setUploading] = useState(false);

  // Dialog States
  const [renameDoc, setRenameDoc] = useState<EnterpriseDocument | null>(null);
  const [moveDoc, setMoveDoc] = useState<EnterpriseDocument | null>(null);

  // Persistent Favorites & Pinned Document IDs
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("sharedesk_favorite_docs");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("sharedesk_pinned_docs");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("sharedesk_favorite_docs", JSON.stringify(Array.from(favoriteIds)));
    } catch (e) {
      console.error("Failed to save favorites to localStorage", e);
    }
  }, [favoriteIds]);

  useEffect(() => {
    try {
      localStorage.setItem("sharedesk_pinned_docs", JSON.stringify(Array.from(pinnedIds)));
    } catch (e) {
      console.error("Failed to save pinned to localStorage", e);
    }
  }, [pinnedIds]);

  // Fetch Current User Profile
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchMyProfile(user!.id),
    enabled: !!user,
  });

  const userDepartment = profile?.department?.trim();

  // Fetch Departments List for Move dialog & filtering
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: getDepartments,
    enabled: !!user,
  });

  // Query All Documents from Supabase
  const {
    data: rawDocuments = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["enterprise-documents"],
    queryFn: fetchEnterpriseDocuments,
    enabled: !!user,
  });

  // Map Favorites and Pinned flags onto documents
  const documents: EnterpriseDocument[] = useMemo(() => {
    return rawDocuments.map((doc) => ({
      ...doc,
      isFavorite: favoriteIds.has(doc.id),
      isPinned: pinnedIds.has(doc.id),
    }));
  }, [rawDocuments, favoriteIds, pinnedIds]);

  // Filter & Section Categorization
  const filteredDocuments = useMemo(() => {
    if (!user) return [];

    let result = documents;

    // 1. Filter by active section tab
    switch (activeSection) {
      case "my":
        result = result.filter((d) => d.uploaded_by === user.id);
        break;
      case "department":
        if (userDepartment) {
          result = result.filter(
            (d) => d.department.toLowerCase() === userDepartment.toLowerCase(),
          );
        }
        break;
      case "recent":
        // Documents created in the last 30 days or sorted by recency
        result = [...result]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 20);
        break;
      case "favorites":
        result = result.filter((d) => d.isFavorite);
        break;
      case "shared":
        result = result.filter((d) => d.uploaded_by !== user.id);
        break;
      default:
        break;
    }

    // 2. Filter by search term
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((d) => {
        const ownerName = d.profiles?.full_name || d.profiles?.email || "";
        return (
          d.file_name.toLowerCase().includes(q) ||
          d.department.toLowerCase().includes(q) ||
          ownerName.toLowerCase().includes(q)
        );
      });
    }

    // 3. Sort documents
    result = [...result].sort((a, b) => {
      // Pinned documents always float to top within current view
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      let compareRes = 0;
      if (sortBy === "name") {
        compareRes = a.file_name.localeCompare(b.file_name);
      } else if (sortBy === "size") {
        compareRes = (a.file_size || 0) - (b.file_size || 0);
      } else {
        // Date sort
        compareRes = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }

      return sortOrder === "asc" ? compareRes : -compareRes;
    });

    return result;
  }, [documents, activeSection, user, userDepartment, search, sortBy, sortOrder]);

  // Document Counts per Section for Tab Badges
  const sectionCounts = useMemo(() => {
    if (!user) return { all: 0, my: 0, department: 0, recent: 0, favorites: 0, shared: 0 };
    return {
      all: documents.length,
      my: documents.filter((d) => d.uploaded_by === user.id).length,
      department: userDepartment
        ? documents.filter((d) => d.department.toLowerCase() === userDepartment.toLowerCase())
            .length
        : 0,
      recent: Math.min(20, documents.length),
      favorites: documents.filter((d) => d.isFavorite).length,
      shared: documents.filter((d) => d.uploaded_by !== user.id).length,
    };
  }, [documents, user, userDepartment]);

  // Handler Actions
  const handleToggleFavorite = useCallback((docId: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
        toast.info("Removed from favorites");
      } else {
        next.add(docId);
        toast.success("Added to favorites");
      }
      return next;
    });
  }, []);

  const handleTogglePin = useCallback((docId: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
        toast.info("Unpinned document");
      } else {
        next.add(docId);
        toast.success("Pinned document to top");
      }
      return next;
    });
  }, []);

  const handleDownload = useCallback(async (doc: EnterpriseDocument) => {
    try {
      await downloadDocumentFile(doc.file_path, doc.file_name);
      toast.success(`Downloaded ${doc.file_name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  }, []);

  const handleDelete = useCallback(
    async (doc: EnterpriseDocument) => {
      if (!confirm(`Are you sure you want to delete "${doc.file_name}"?`)) return;

      try {
        await deleteDocumentFromStorageAndDb(doc.id, doc.file_path);
        toast.success(`Deleted ${doc.file_name}`);
        await qc.invalidateQueries({ queryKey: ["enterprise-documents"] });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Delete failed");
      }
    },
    [qc],
  );

  if (!user) return null;

  const handleRenameConfirm = async (doc: EnterpriseDocument, newName: string) => {
    try {
      await renameDocumentInDb(doc.id, newName);
      toast.success("Document renamed successfully");
      await qc.invalidateQueries({ queryKey: ["enterprise-documents"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rename failed");
    }
  };

  const handleMoveConfirm = async (doc: EnterpriseDocument, targetDepartment: string) => {
    try {
      await moveDocumentInDb(doc.id, targetDepartment);
      toast.success(`Moved document to ${targetDepartment}`);
      await qc.invalidateQueries({ queryKey: ["enterprise-documents"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Move failed");
    }
  };

  const handleFileUpload = async (file: File) => {
    const validation = validateFileUpload(file, { maxSizeBytes: 50 * 1024 * 1024 });
    if (!validation.valid) {
      toast.error(validation.error || "Invalid file for upload.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const deptToUse = userDepartment || "General";
    setUploading(true);

    try {
      const safeDept = deptToUse
        .toLowerCase()
        .trim()
        .replace(/[^\w-]+/g, "_");
      const safeName = sanitizeFileName(file.name);
      const filePath = `${safeDept}/${user.id}/${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("department-documents")
        .upload(filePath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: documentRow, error: documentError } = await supabase
        .from("department_documents")
        .insert({
          department: deptToUse,
          uploaded_by: user.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_mime: file.type || "application/octet-stream",
        })
        .select()
        .single();

      if (documentError) {
        await supabase.storage.from("department-documents").remove([filePath]);
        throw documentError;
      }

      // Trigger document ingestion background job
      try {
        const session = await supabase.auth.getSession();
        const accessToken = session.data.session?.access_token;
        if (accessToken) {
          await ingestDocumentAction({
            data: { accessToken, documentId: documentRow.id },
          });
        }
      } catch (ingestErr) {
        console.error("[Ingestion Error]", ingestErr);
      }

      toast.success(`Uploaded ${file.name}`);
      await qc.invalidateQueries({ queryKey: ["enterprise-documents"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar Navigation */}
      <div className="hidden lg:block w-80 shrink-0 border-r border-border">
        <ChatSidebar userId={user.id} />
      </div>

      {/* Main Enterprise Documents Area */}
      <main className="flex flex-1 flex-col overflow-y-auto scrollbar-thin">
        {/* Workspace Header */}
        <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FolderOpen className="size-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  Enterprise Documents Workspace
                </h1>
                <p className="text-xs text-muted-foreground">
                  Manage, share, and organize company department documents & files.
                </p>
              </div>
            </div>

            {/* Hidden File Input & Upload Trigger */}
            <div className="flex items-center gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileUpload(file);
                }}
              />
              <Button
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 shadow-sm"
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                <span>Upload Document</span>
              </Button>
            </div>
          </div>

          {/* Section Navigation Tabs */}
          <div className="mt-5">
            <Tabs
              value={activeSection}
              onValueChange={(val) => setActiveSection(val as DocumentSection)}
            >
              <TabsList className="w-full sm:w-auto overflow-x-auto justify-start border border-border bg-muted/60 p-1">
                <TabsTrigger value="all" className="gap-1.5 text-xs">
                  <FolderOpen className="size-3.5" />
                  <span>All Docs</span>
                  <span className="ml-1 rounded-full bg-background px-1.5 py-0.2 text-[10px] font-semibold border">
                    {sectionCounts.all}
                  </span>
                </TabsTrigger>

                <TabsTrigger value="my" className="gap-1.5 text-xs">
                  <UserCheck className="size-3.5" />
                  <span>My Documents</span>
                  <span className="ml-1 rounded-full bg-background px-1.5 py-0.2 text-[10px] font-semibold border">
                    {sectionCounts.my}
                  </span>
                </TabsTrigger>

                <TabsTrigger value="department" className="gap-1.5 text-xs">
                  <Building2 className="size-3.5" />
                  <span>Department</span>
                  <span className="ml-1 rounded-full bg-background px-1.5 py-0.2 text-[10px] font-semibold border">
                    {sectionCounts.department}
                  </span>
                </TabsTrigger>

                <TabsTrigger value="recent" className="gap-1.5 text-xs">
                  <Clock className="size-3.5" />
                  <span>Recent</span>
                  <span className="ml-1 rounded-full bg-background px-1.5 py-0.2 text-[10px] font-semibold border">
                    {sectionCounts.recent}
                  </span>
                </TabsTrigger>

                <TabsTrigger value="favorites" className="gap-1.5 text-xs">
                  <Star className="size-3.5" />
                  <span>Favorites</span>
                  <span className="ml-1 rounded-full bg-background px-1.5 py-0.2 text-[10px] font-semibold border">
                    {sectionCounts.favorites}
                  </span>
                </TabsTrigger>

                <TabsTrigger value="shared" className="gap-1.5 text-xs">
                  <Share2 className="size-3.5" />
                  <span>Shared With Me</span>
                  <span className="ml-1 rounded-full bg-background px-1.5 py-0.2 text-[10px] font-semibold border">
                    {sectionCounts.shared}
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </header>

        {/* Toolbar & Document View Container */}
        <div className="p-6 space-y-6 max-w-7xl w-full mx-auto">
          {/* Search, Sort & View Mode Toolbar */}
          <DocumentSearchSort
            search={search}
            onSearchChange={setSearch}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortOrder={sortOrder}
            onToggleSortOrder={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {/* Document Content Display States */}
          {isLoading ? (
            <DocumentLoading viewMode={viewMode} count={6} />
          ) : isError ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center my-6">
              <AlertCircle className="size-10 text-destructive mb-3" />
              <h3 className="text-base font-semibold text-foreground mb-1">
                Failed to load documents
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mb-4">
                {error instanceof Error ? error.message : "An unexpected server error occurred."}
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
          ) : filteredDocuments.length === 0 ? (
            <DocumentEmpty
              section={activeSection}
              hasQuery={Boolean(search.trim())}
              onClearQuery={() => setSearch("")}
              onUploadClick={() => fileInputRef.current?.click()}
            />
          ) : viewMode === "grid" ? (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  currentUserId={user.id}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                  onRename={setRenameDoc}
                  onMove={setMoveDoc}
                  onToggleFavorite={handleToggleFavorite}
                  onTogglePin={handleTogglePin}
                />
              ))}
            </div>
          ) : (
            /* List View */
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[40%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Document
                    </TableHead>
                    <TableHead className="w-[20%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Owner
                    </TableHead>
                    <TableHead className="w-[15%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Department
                    </TableHead>
                    <TableHead className="w-[10%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Size
                    </TableHead>
                    <TableHead className="w-[15%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Modified
                    </TableHead>
                    <TableHead className="w-[5%] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <DocumentListRow
                      key={doc.id}
                      document={doc}
                      currentUserId={user.id}
                      onDownload={handleDownload}
                      onDelete={handleDelete}
                      onRename={setRenameDoc}
                      onMove={setMoveDoc}
                      onToggleFavorite={handleToggleFavorite}
                      onTogglePin={handleTogglePin}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>

      {/* Rename Dialog */}
      <DocumentRenameDialog
        document={renameDoc}
        open={Boolean(renameDoc)}
        onOpenChange={(open) => {
          if (!open) setRenameDoc(null);
        }}
        onConfirm={handleRenameConfirm}
      />

      {/* Move Dialog */}
      <DocumentMoveDialog
        document={moveDoc}
        departments={departments}
        open={Boolean(moveDoc)}
        onOpenChange={(open) => {
          if (!open) setMoveDoc(null);
        }}
        onConfirm={handleMoveConfirm}
      />
    </div>
  );
}
