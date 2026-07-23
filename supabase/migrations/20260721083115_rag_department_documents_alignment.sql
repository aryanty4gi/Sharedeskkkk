-- ===========================================================
-- ShareDesk Workplace
-- RAG Alignment Migration
-- document_chunks -> department_documents
-- ===========================================================

-- Drop old foreign key
ALTER TABLE public.document_chunks
DROP CONSTRAINT IF EXISTS document_chunks_document_id_fkey;

-- Point to the existing production table
ALTER TABLE public.document_chunks
ADD CONSTRAINT document_chunks_document_id_fkey
FOREIGN KEY (document_id)
REFERENCES public.department_documents(id)
ON DELETE CASCADE;