import { CHUNK_OVERLAP, MAX_CHUNK_SIZE } from "./constants";

import type { ChunkOptions, DocumentChunk } from "./types";

export function chunkText(text: string, options?: ChunkOptions): DocumentChunk[] {
  const chunkSize = options?.chunkSize ?? MAX_CHUNK_SIZE;
  const overlap = options?.overlap ?? CHUNK_OVERLAP;

  const normalized = text
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) return [];

  const chunks: DocumentChunk[] = [];

  let start = 0;
  let index = 0;

  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);

    const slice = normalized.slice(start, end);

    chunks.push({
      chunkIndex: index,
      content: slice,
      characterCount: slice.length,
    });

    if (end >= normalized.length) break;

    start = Math.max(0, end - overlap);
    index++;
  }

  return chunks;
}
