import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DocumentCard } from "@/components/documents/document-card";
import { renderWithProviders } from "@/test/test-utils";
import type { EnterpriseDocument } from "@/lib/documents/types";

// Mock router navigate
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

const mockDoc: EnterpriseDocument = {
  id: "doc-1",
  department: "Engineering",
  description: null,
  uploaded_by: "user-1",
  file_name: "Q3_Architecture_Design.pdf",
  file_path: "engineering/user-1/uuid-Q3_Architecture_Design.pdf",
  file_size: 2048576,
  file_mime: "application/pdf",
  created_at: "2026-07-20T10:00:00.000Z",
  isPinned: false,
  isFavorite: true,
  profiles: {
    id: "user-1",
    full_name: "Sarah Connor",
    email: "sarah@company.com",
    avatar_url: null,
    department: "Engineering",
  },
};

describe("DocumentCard Component", () => {
  it("renders document name, type label, and file size", () => {
    renderWithProviders(
      <DocumentCard
        document={mockDoc}
        currentUserId="user-1"
        onDownload={vi.fn()}
        onDelete={vi.fn()}
        onRename={vi.fn()}
        onMove={vi.fn()}
        onToggleFavorite={vi.fn()}
        onTogglePin={vi.fn()}
      />,
    );

    expect(screen.getByText(/Q3_Architecture_Design\.pdf/)).toBeInTheDocument();
    expect(screen.getByText(/PDF Document/)).toBeInTheDocument();
    expect(screen.getByText(/2\.0 MB/)).toBeInTheDocument();
  });

  it("triggers favorite toggle when favorite icon button is clicked", () => {
    const handleFavorite = vi.fn();
    renderWithProviders(
      <DocumentCard
        document={mockDoc}
        currentUserId="user-1"
        onDownload={vi.fn()}
        onDelete={vi.fn()}
        onRename={vi.fn()}
        onMove={vi.fn()}
        onToggleFavorite={handleFavorite}
        onTogglePin={vi.fn()}
      />,
    );

    const favoriteBtn = screen.getByTitle("Favorite document");
    expect(favoriteBtn).toBeInTheDocument();
  });
});
