import { generateEmbedding } from "@/lib/rag/embeddings";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Custom error class for failures occurring during query embedding generation.
 */
export class EmbeddingGenerationError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "EmbeddingGenerationError";
  }
}

/**
 * Custom error class for failures occurring during Supabase RPC execution.
 */
export class DatabaseRetrievalError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "DatabaseRetrievalError";
  }
}

export interface RetrievalSource {
  documentId: string;
  chunkId: string;
  fileName: string;
  department: string;
  similarity: number;
}

export interface RetrievalResult {
  chunks: {
    chunk_id: string;
    chunk_index: number;
    content: string;
    doc_department: string;
    document_id: string;
    file_name: string;
    similarity: number;
  }[];
  context: string;
  sources: RetrievalSource[];
  retrievalTimeMs: number;
  selectedThreshold: number;
  totalRetrievedChunks: number;
  chunksUsed: number;
  contextSize: number;
}

interface RetrieveContextParams {
  query: string;
  department: string;
  userId: string;
  matchThreshold?: number;
  matchCount?: number;
}

/**
 * Retrieves relevant context chunks for a given query, scoped by department, using adaptive similarity threshold vector search.
 *
 * @param params Object containing query, department, userId, and optional match settings.
 * @returns A promise resolving to the structured retrieval result.
 * @throws EmbeddingGenerationError if query embedding fails.
 * @throws DatabaseRetrievalError if RPC semantic match fails.
 */
export async function retrieveContext({
  query,
  department,
  userId,
  matchThreshold = 0.75,
  matchCount = 5,
}: RetrieveContextParams): Promise<RetrievalResult> {
  const startTime = performance.now();
  console.log(
    `[RAG Retrieval] Query received: "${query}" for department: "${department}" (Requesting User ID: ${userId})`,
  );

  // 1. Generate query embedding
  let queryEmbedding: number[];
  try {
    console.log(`[RAG Retrieval] Embedding generation started for query: "${query}"`);
    queryEmbedding = await generateEmbedding(query);
    console.log(`[RAG Retrieval] Embedding generation completed successfully.`);
  } catch (embErr) {
    console.error(`[RAG Retrieval] Embedding generation failed:`, embErr);
    throw new EmbeddingGenerationError(
      `Failed to generate query embedding: ${embErr instanceof Error ? embErr.message : String(embErr)}`,
      embErr,
    );
  }

  // 2. Call match_document_chunks RPC with adaptive threshold
  // Attempts starting at 0.75, then 0.65, then 0.55. Stops immediately when >= 1 chunk is found.
  const adaptiveThresholds = [0.75, 0.65, 0.55];
  let chunks: RetrievalResult["chunks"] = [];
  let selectedThreshold = matchThreshold;

  try {
    for (const threshold of adaptiveThresholds) {
      selectedThreshold = threshold;
      console.log(
        `[RAG Retrieval] RPC execution started (threshold: ${threshold}, count: ${matchCount})...`,
      );

      const { data, error } = await supabaseAdmin.rpc("match_document_chunks", {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: threshold,
        match_count: matchCount,
        department: department,
      });

      if (error) {
        console.error(`[RAG Retrieval] Supabase RPC failed:`, error.message);
        throw new DatabaseRetrievalError(`Supabase RPC execution failed: ${error.message}`, error);
      }

      chunks = data || [];
      if (chunks.length > 0) {
        console.log(
          `[RAG Retrieval] Adaptive search matched ${chunks.length} chunks at threshold: ${threshold}`,
        );
        break;
      }
    }
  } catch (rpcErr) {
    if (rpcErr instanceof DatabaseRetrievalError) {
      throw rpcErr;
    }
    console.error(`[RAG Retrieval] Database search exception:`, rpcErr);
    throw new DatabaseRetrievalError(
      `Failed to execute database search: ${rpcErr instanceof Error ? rpcErr.message : String(rpcErr)}`,
      rpcErr,
    );
  }

  const retrievalTimeMs = Math.round(performance.now() - startTime);
  const totalRetrievedChunks = chunks.length;
  console.log(
    `[RAG Retrieval] Retrieval process took ${retrievalTimeMs}ms. Threshold selected: ${selectedThreshold}`,
  );

  // 3. Handle case when no chunks match
  if (totalRetrievedChunks === 0) {
    console.log(`[RAG Retrieval] No relevant chunks found above adaptive thresholds.`);
    return {
      chunks: [],
      context: "",
      sources: [],
      retrievalTimeMs,
      selectedThreshold,
      totalRetrievedChunks: 0,
      chunksUsed: 0,
      contextSize: 0,
    };
  }

  // 4. Guarantee highest similarity sorting
  chunks.sort((a, b) => b.similarity - a.similarity);

  // 5. Assemble context subject to a character budget (max 7000 chars, complete chunks only)
  let context = "";
  let chunksUsed = 0;
  const assembledChunks: typeof chunks = [];

  for (const chunk of chunks) {
    const formattedChunk = `[Document: ${chunk.file_name} (Chunk: ${chunk.chunk_index}, Similarity: ${(chunk.similarity * 100).toFixed(1)}%)]\n${chunk.content}`;
    const separator = context.length > 0 ? "\n\n" : "";
    const potentialNextContext = context + separator + formattedChunk;

    if (potentialNextContext.length <= 7000) {
      context = potentialNextContext;
      chunksUsed++;
      assembledChunks.push(chunk);
    } else {
      console.log(
        `[RAG Retrieval] Context character limit (7000) reached. Skipping remaining chunks. Current size: ${context.length}`,
      );
      break;
    }
  }

  console.log(
    `[RAG Retrieval] Budget summary: Retrieved ${totalRetrievedChunks} chunks. Used ${chunksUsed} chunks. Context length: ${context.length} chars.`,
  );

  // 6. Generate unique chunk sources from used chunks
  const sources: RetrievalSource[] = assembledChunks.map((chunk) => ({
    documentId: chunk.document_id,
    chunkId: chunk.chunk_id,
    fileName: chunk.file_name,
    department: chunk.doc_department,
    similarity: chunk.similarity,
  }));

  console.log(`[RAG Retrieval] Context successfully assembled. Return payload constructed.`);
  return {
    chunks: assembledChunks,
    context,
    sources,
    retrievalTimeMs,
    selectedThreshold,
    totalRetrievedChunks,
    chunksUsed,
    contextSize: context.length,
  };
}
