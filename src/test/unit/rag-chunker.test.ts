import { describe, it, expect } from "vitest";
import { chunkText } from "@/lib/rag/chunker";

describe("RAG Text Chunking Utility", () => {
  it("should return empty array for empty or whitespace text", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n\n  ")).toEqual([]);
  });

  it("should create a single chunk when text length is within chunk size", () => {
    const text = "This is a short sample document.";
    const chunks = chunkText(text, { chunkSize: 500 });
    expect(chunks.length).toBe(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].content).toBe(text);
    expect(chunks[0].characterCount).toBe(text.length);
  });

  it("should split long text into multiple overlapping chunks", () => {
    const text =
      "Paragraph 1 sentence.\nParagraph 2 sentence.\nParagraph 3 sentence.\nParagraph 4 sentence.";
    const chunks = chunkText(text, { chunkSize: 30, overlap: 10 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[1].chunkIndex).toBe(1);
  });
});
