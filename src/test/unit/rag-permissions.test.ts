import { describe, it, expect, vi } from "vitest";

// Mock supabaseAdmin for getDepartmentDocument
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "doc-123", file_name: "policy.pdf", department: "Engineering" },
            error: null,
          }),
        }),
      }),
    }),
  },
}));

import { getDepartmentDocument } from "@/lib/rag/permissions";

describe("RAG Permissions Helper", () => {
  it("should fetch department document successfully", async () => {
    const doc = await getDepartmentDocument("doc-123");
    expect(doc).toBeDefined();
    expect(doc.id).toBe("doc-123");
    expect(doc.file_name).toBe("policy.pdf");
  });
});
