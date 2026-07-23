import { FolderOpen, Upload, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DocumentSection } from "@/lib/documents/types";

interface DocumentEmptyProps {
  section: DocumentSection;
  hasQuery: boolean;
  onClearQuery: () => void;
  onUploadClick?: () => void;
}

function getEmptyContent(section: DocumentSection, hasQuery: boolean) {
  if (hasQuery) {
    return {
      title: "No documents found",
      description: "No documents matched your search query. Try searching with different keywords.",
      icon: SearchX,
    };
  }

  switch (section) {
    case "my":
      return {
        title: "No personal documents",
        description: "You haven't uploaded any documents yet. Click Upload to add your first file.",
        icon: FolderOpen,
      };
    case "department":
      return {
        title: "No department documents",
        description: "No documents have been uploaded for your department yet.",
        icon: FolderOpen,
      };
    case "recent":
      return {
        title: "No recent documents",
        description: "There are no recent files available in your workspace.",
        icon: FolderOpen,
      };
    case "favorites":
      return {
        title: "No favorite documents",
        description: "Star important documents to quickly access them in your favorites list.",
        icon: FolderOpen,
      };
    case "shared":
      return {
        title: "No shared documents",
        description: "No documents shared by other team members were found.",
        icon: FolderOpen,
      };
    default:
      return {
        title: "No documents found",
        description: "Upload a document to get started.",
        icon: FolderOpen,
      };
  }
}

export function DocumentEmpty({
  section,
  hasQuery,
  onClearQuery,
  onUploadClick,
}: DocumentEmptyProps) {
  const content = getEmptyContent(section, hasQuery);
  const IconComponent = content.icon;

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 p-8 text-center min-h-[320px] my-4">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
        <IconComponent className="size-7" />
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-1">{content.title}</h3>
      <p className="max-w-md text-sm text-muted-foreground mb-6">{content.description}</p>

      <div className="flex items-center gap-3">
        {hasQuery ? (
          <Button variant="outline" size="sm" onClick={onClearQuery}>
            Clear search filter
          </Button>
        ) : onUploadClick ? (
          <Button size="sm" onClick={onUploadClick} className="gap-2">
            <Upload className="size-4" />
            <span>Upload Document</span>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
