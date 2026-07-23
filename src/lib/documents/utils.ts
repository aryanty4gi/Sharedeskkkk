import { FileText, FileImage, FileSpreadsheet, FileArchive, FileCode, File } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { EnterpriseDocument } from "./types";

/**
 * Returns icon, label, and style theme based on file extension and MIME type
 */
export function getFileTypeInfo(fileName: string, fileMime: string | null) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const mime = (fileMime || "").toLowerCase();

  if (mime.includes("pdf") || ext === "pdf") {
    return {
      label: "PDF Document",
      icon: FileText,
      color: "text-rose-600 bg-rose-500/10 border-rose-500/20 dark:text-rose-400",
    };
  }

  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext)) {
    return {
      label: "Image",
      icon: FileImage,
      color: "text-blue-600 bg-blue-500/10 border-blue-500/20 dark:text-blue-400",
    };
  }

  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    ["csv", "xlsx", "xls"].includes(ext)
  ) {
    return {
      label: "Spreadsheet",
      icon: FileSpreadsheet,
      color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400",
    };
  }

  if (
    mime.includes("zip") ||
    mime.includes("compressed") ||
    ["zip", "rar", "7z", "tar", "gz"].includes(ext)
  ) {
    return {
      label: "Archive",
      icon: FileArchive,
      color: "text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400",
    };
  }

  if (
    mime.includes("json") ||
    mime.includes("javascript") ||
    mime.includes("typescript") ||
    ["js", "ts", "tsx", "jsx", "html", "css", "py", "json", "md"].includes(ext)
  ) {
    return {
      label: "Code File",
      icon: FileCode,
      color: "text-purple-600 bg-purple-500/10 border-purple-500/20 dark:text-purple-400",
    };
  }

  return {
    label: "Document",
    icon: File,
    color: "text-primary bg-primary/10 border-primary/20",
  };
}

/**
 * Formats file size in bytes to human readable string (KB, MB, GB)
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Fetches all department documents with uploader profiles
 */
export async function fetchEnterpriseDocuments(): Promise<EnterpriseDocument[]> {
  const { data, error } = await supabase
    .from("department_documents")
    .select(
      `
      *,
      profiles:uploaded_by (
        id,
        full_name,
        email,
        avatar_url,
        department
      )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as EnterpriseDocument[];
}

/**
 * Renames document file_name in Supabase
 */
export async function renameDocumentInDb(documentId: string, newFileName: string) {
  const trimmed = newFileName.trim();
  if (!trimmed) throw new Error("File name cannot be empty.");

  const { error } = await supabase
    .from("department_documents")
    .update({ file_name: trimmed })
    .eq("id", documentId);

  if (error) throw error;
}

/**
 * Moves document to a different department
 */
export async function moveDocumentInDb(documentId: string, newDepartment: string) {
  const trimmed = newDepartment.trim();
  if (!trimmed) throw new Error("Department cannot be empty.");

  const { error } = await supabase
    .from("department_documents")
    .update({ department: trimmed })
    .eq("id", documentId);

  if (error) throw error;
}

/**
 * Deletes document from storage bucket and database table
 */
export async function deleteDocumentFromStorageAndDb(id: string, filePath: string) {
  const { error: storageError } = await supabase.storage
    .from("department-documents")
    .remove([filePath]);

  if (storageError) {
    console.warn("[Storage Removal Warning]", storageError);
  }

  const { error: databaseError } = await supabase
    .from("department_documents")
    .delete()
    .eq("id", id);

  if (databaseError) throw databaseError;
}

/**
 * Downloads document file from Supabase storage
 */
export async function downloadDocumentFile(filePath: string, fileName: string) {
  const { data, error } = await supabase.storage.from("department-documents").download(filePath);

  if (error) throw error;

  const url = URL.createObjectURL(data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
