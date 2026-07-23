export type DocumentSection = "all" | "my" | "department" | "recent" | "favorites" | "shared";

export type DocumentSortBy = "name" | "date" | "size";
export type DocumentSortOrder = "asc" | "desc";
export type ViewMode = "grid" | "list";

export interface DocumentOwner {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  department: string | null;
}

export interface EnterpriseDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_mime: string | null;
  department: string;
  description: string | null;
  uploaded_by: string;
  created_at: string;
  profiles?: DocumentOwner | null;
  isFavorite?: boolean;
  isPinned?: boolean;
}
