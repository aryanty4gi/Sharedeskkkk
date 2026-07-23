export const MAX_CHUNK_SIZE = 1200;

export const CHUNK_OVERLAP = 200;

export const MAX_FILE_SIZE = 25 * 1024 * 1024;

export const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
] as const;

export const PARAGRAPH_SEPARATOR = "\n\n";

export const SENTENCE_SEPARATOR = /(?<=[.!?])\s+/;

export const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001";

export const DEFAULT_CHAT_MODEL = "gemini-2.5-pro";
