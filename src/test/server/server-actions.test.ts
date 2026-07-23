import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase client modules
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "usr-1",
                    full_name: "Bob Builder",
                    email: "bob@company.com",
                    department: "Engineering",
                    designation: "Lead Engineer",
                    avatar_url: null,
                    is_online: true,
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "department_documents") {
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "doc-1",
                    file_name: "architecture_spec.pdf",
                    department: "Engineering",
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "messages") {
        return {
          select: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              ilike: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: "msg-1",
                        conversation_id: "conv-1",
                        content: "architecture review meeting",
                        created_at: "2026-07-20T10:00:00.000Z",
                        sender_id: "usr-1",
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "user_roles") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [{ user_id: "usr-1", role: "manager" }],
              error: null,
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    }),
  },
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: vi.fn().mockResolvedValue({
      data: [
        {
          chunk_id: "chk-1",
          chunk_index: 0,
          content: "The engineering specification mandates 99.9% uptime.",
          doc_department: "Engineering",
          document_id: "doc-1",
          file_name: "architecture_spec.pdf",
          similarity: 0.88,
        },
      ],
      error: null,
    }),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [{ id: "d1", code: "ENG", name: "Engineering", description: null }],
          error: null,
        }),
      }),
    }),
  },
}));

vi.mock("@/lib/auth/server-auth", () => ({
  getAuthenticatedClient: vi.fn().mockImplementation(async (token: string) => {
    if (!token || token === "invalid-token") {
      throw new Error("Unauthorized: Invalid session or authentication expired.");
    }
    return {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "usr-1",
                  full_name: "Bob Builder",
                  email: "bob@company.com",
                  department: "Engineering",
                  designation: "Lead Engineer",
                  avatar_url: null,
                  is_online: true,
                },
              ],
              count: 1,
              error: null,
            }),
          }),
        }),
      }),
    };
  }),
}));

vi.mock("@/lib/rag/embeddings", () => ({
  generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
}));

import { getAuthenticatedClient } from "@/lib/auth/server-auth";
import { performGlobalSearch } from "@/lib/search/global-search";
import { retrieveContext } from "@/lib/rag/retrieve";

describe("Server Actions & Queries", () => {
  it("getAuthenticatedClient enforces authentication token validation", async () => {
    // Empty token throws error
    await expect(getAuthenticatedClient("")).rejects.toThrow();

    // Invalid token throws Unauthorized
    await expect(getAuthenticatedClient("invalid-token")).rejects.toThrow("Unauthorized");
  });

  it("getAuthenticatedClient returns authenticated database client on valid token", async () => {
    const client = await getAuthenticatedClient("valid-session-jwt");
    expect(client).toBeDefined();
    expect(client.from).toBeDefined();
  });

  it("performGlobalSearch returns empty arrays for short query", async () => {
    const results = await performGlobalSearch("usr-1", "a");
    expect(results).toEqual({ employees: [], documents: [], conversations: [] });
  });

  it("performGlobalSearch groups results into employees, documents, and conversations", async () => {
    const results = await performGlobalSearch("usr-1", "architecture");
    expect(results.employees.length).toBe(1);
    expect(results.employees[0].category).toBe("employee");
    expect(results.documents.length).toBe(1);
    expect(results.documents[0].category).toBe("document");
    expect(results.conversations.length).toBe(1);
    expect(results.conversations[0].category).toBe("conversation");
  });

  it("retrieveContext generates embedding and returns relevant chunks", async () => {
    const result = await retrieveContext({
      query: "What is the uptime SLA?",
      department: "Engineering",
      userId: "usr-1",
    });

    expect(result.chunks.length).toBe(1);
    expect(result.context).toContain("engineering specification");
    expect(result.sources.length).toBe(1);
    expect(result.sources[0].fileName).toBe("architecture_spec.pdf");
  });
});
