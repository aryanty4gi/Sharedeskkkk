import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  Download,
  FileText,
  FolderOpen,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/chat/use-current-user";
import { fetchMyProfile } from "@/lib/chat/queries";

export const Route = createFileRoute("/_authenticated/documents")({
  component: DepartmentDocuments,
});

function DepartmentDocuments() {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchMyProfile(user!.id),
    enabled: !!user,
  });

  const department = profile?.department?.trim();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["department-documents", department],
    enabled: !!department,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("department_documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  if (!user) return null;

  async function uploadFile(file: File) {
    if (!department || !user) return;

    setUploading(true);

    try {
      const safeDepartment = department.toLowerCase().trim();
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const filePath = `${safeDepartment}/${user.id}/${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("department-documents")
        .upload(filePath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { error: documentError } = await supabase
        .from("department_documents")
        .insert({
          department,
          uploaded_by: user.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_mime: file.type || "application/octet-stream",
        });

      if (documentError) {
        await supabase.storage
          .from("department-documents")
          .remove([filePath]);

        throw documentError;
      }

      await qc.invalidateQueries({
        queryKey: ["department-documents"],
      });
    } catch (error) {
      console.error("DEPARTMENT DOCUMENT UPLOAD ERROR:", error);
      alert(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);

      if (fileInput.current) {
        fileInput.current.value = "";
      }
    }
  }

  async function downloadFile(filePath: string, fileName: string) {
    try {
      const { data, error } = await supabase.storage
        .from("department-documents")
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("DEPARTMENT DOCUMENT DOWNLOAD ERROR:", error);
      alert(error instanceof Error ? error.message : "Download failed");
    }
  }

  async function deleteDocument(id: string, filePath: string) {
    try {
      const { error: storageError } = await supabase.storage
        .from("department-documents")
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: databaseError } = await supabase
        .from("department_documents")
        .delete()
        .eq("id", id);

      if (databaseError) throw databaseError;

      await qc.invalidateQueries({
        queryKey: ["department-documents"],
      });
    } catch (error) {
      console.error("DEPARTMENT DOCUMENT DELETE ERROR:", error);
      alert(error instanceof Error ? error.message : "Delete failed");
    }
  }

  return (
    <div className="grid h-screen w-screen grid-cols-1 md:grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr]">
      <ChatSidebar userId={user.id} />

      <main className="flex min-w-0 flex-col bg-background">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <FolderOpen className="size-5 text-primary" />
              <h1 className="text-lg font-semibold">
                Department Documents
              </h1>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              {department
                ? `${department} Department`
                : "No department assigned"}
            </p>
          </div>

          {department && (
            <>
              <Input
                ref={fileInput}
                type="file"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadFile(file);
                }}
              />

              <Button
                disabled={uploading}
                onClick={() => fileInput.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 size-4" />
                )}

                Upload document
              </Button>
            </>
          )}
        </header>

        {!department ? (
          <div className="flex flex-1 items-center justify-center p-8 text-center">
            <div>
              <FolderOpen className="mx-auto size-10 text-muted-foreground" />
              <h2 className="mt-4 font-semibold">
                Department not assigned
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Contact your administrator to assign your department.
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-8 text-center">
            <div>
              <FileText className="mx-auto size-10 text-muted-foreground" />
              <h2 className="mt-4 font-semibold">
                No documents yet
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload the first document for the {department} department.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-y-auto p-6">
            <div className="space-y-2">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="size-5 text-primary" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {document.file_name}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {document.file_size
                        ? `${(document.file_size / 1024 / 1024).toFixed(2)} MB`
                        : "Document"}
                    </p>
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    title="Download"
                    onClick={() =>
                      void downloadFile(
                        document.file_path,
                        document.file_name,
                      )
                    }
                  >
                    <Download className="size-4" />
                  </Button>

                  {document.uploaded_by === user.id && (
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Delete"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        void deleteDocument(
                          document.id,
                          document.file_path,
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}