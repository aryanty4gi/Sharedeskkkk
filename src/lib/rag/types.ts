export interface ParsedDocument {
  text: string;
  pageCount?: number;
  metadata?: Record<string, unknown>;
}

export interface DocumentChunk {
  chunkIndex: number;
  content: string;
  characterCount: number;
}

export interface ChunkOptions {
  chunkSize?: number;
  overlap?: number;
}
