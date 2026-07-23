import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getDepartmentDocument } from "@/lib/rag/permissions";
import { downloadDepartmentDocument } from "@/lib/rag/storage";
import { parseDocument } from "@/lib/rag/parser";
import { chunkText } from "@/lib/rag/chunker";
import { generateEmbedding } from "@/lib/rag/embeddings";
import { DEFAULT_EMBEDDING_MODEL } from "@/lib/rag/constants";

const ingestInputSchema = z.object({
  accessToken: z.string().min(1),
  documentId: z.string().uuid(),
});

export const ingestDocumentAction = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ingestInputSchema.parse(input))
  .handler(async ({ data }) => {
    const startTime = performance.now();
    const { accessToken, documentId } = data;

    try {
      console.log(`[RAG Ingestion] Starting ingestion process for document ID: ${documentId}`);

      // 1. Authenticate the user
      const user = await getAuthenticatedUser(accessToken);
      console.log(`[RAG Ingestion] User authenticated successfully: ${user.id}`);

      // 2. Load the department_documents record
      const document = await getDepartmentDocument(documentId);
      console.log(
        `[RAG Ingestion] Loaded document record: "${document.file_name}" (MIME: ${document.file_mime})`,
      );

      // 3. Download the document from the private "department-documents" bucket
      console.log(`[RAG Ingestion] Downloading file from storage path: ${document.file_path}`);
      const arrayBuffer = await downloadDepartmentDocument(document.file_path);

      // 4. Parse the document based on MIME type
      console.log(`[RAG Ingestion] Parsing document content...`);
      const parsed = await parseDocument(arrayBuffer, document.file_mime || "");

      // 5. Chunk the parsed text
      console.log(
        `[RAG Ingestion] Chunking parsed document text (length: ${parsed.text.length} characters)`,
      );
      const chunks = chunkText(parsed.text);
      console.log(`[RAG Ingestion] Generated ${chunks.length} text chunks`);

      // 6. Delete any existing rows from document_chunks for this document
      console.log(`[RAG Ingestion] Deleting any existing chunks for document ID: ${documentId}`);
      const { error: deleteError } = await supabaseAdmin
        .from("document_chunks")
        .delete()
        .eq("document_id", document.id);

      if (deleteError) {
        console.error(
          `[RAG Ingestion] Failed to delete existing chunks for document ${documentId}:`,
          deleteError.message,
        );
        throw new Error(`Failed to delete existing document chunks: ${deleteError.message}`);
      }

      // 7. Generate embedding for every chunk sequentially and bulk insert
      let successfulEmbeddings = 0;
      let failedEmbeddings = 0;
      const chunksToInsert = [];

      if (chunks.length > 0) {
        console.log(`[RAG Ingestion] Embedding generation started for ${chunks.length} chunks...`);

        for (const chunk of chunks) {
          let embedding: number[] | null = null;
          try {
            console.log(`[RAG Ingestion] Embedding started for chunk index ${chunk.chunkIndex}`);
            embedding = await generateEmbedding(chunk.content);
            console.log(`[RAG Ingestion] Embedding completed for chunk index ${chunk.chunkIndex}`);
            successfulEmbeddings++;
          } catch (embErr) {
            console.error(
              `[RAG Ingestion] Embedding failed for chunk index ${chunk.chunkIndex}:`,
              embErr,
            );
            failedEmbeddings++;
          }

          chunksToInsert.push({
            document_id: document.id,
            chunk_index: chunk.chunkIndex,
            content: chunk.content,
            embedding: embedding ? JSON.stringify(embedding) : null,
            embedding_model: embedding ? DEFAULT_EMBEDDING_MODEL : null,
            embedded_at: embedding ? new Date().toISOString() : null,
            page_number: null,
            token_count: null,
          });
        }

        console.log(
          `[RAG Ingestion] Bulk inserting ${chunksToInsert.length} new chunks for document ID: ${documentId} (Success embeddings: ${successfulEmbeddings}, Failed embeddings: ${failedEmbeddings})`,
        );

        const { error: insertError } = await supabaseAdmin
          .from("document_chunks")
          .insert(chunksToInsert);

        if (insertError) {
          console.error(
            `[RAG Ingestion] Failed to bulk insert chunks for document ${documentId}:`,
            insertError.message,
          );
          throw new Error(`Failed to insert document chunks: ${insertError.message}`);
        }
      } else {
        console.warn(`[RAG Ingestion] No chunks generated for document ID: ${documentId}`);
      }

      const processingTimeMs = Math.round(performance.now() - startTime);
      console.log(
        `[RAG Ingestion] Ingestion completed successfully for document ID: ${documentId} in ${processingTimeMs}ms (Embedded chunks: ${successfulEmbeddings}, Failed embeddings: ${failedEmbeddings})`,
      );

      return {
        success: true as const,
        documentId,
        chunkCount: chunks.length,
        embeddedChunks: successfulEmbeddings,
        failedEmbeddings,
        processingTimeMs,
      };
    } catch (err) {
      console.error(
        `[RAG Ingestion] Critical error occurred during ingestion of document ID: ${documentId}`,
        err,
      );
      throw err instanceof Error ? err : new Error(String(err));
    }
  });
