-- ===========================================================
-- ShareDesk Workplace
-- RAG Retrieval Optimization Migration
-- ===========================================================

-- Drop the old function first since the return table signature is changing
DROP FUNCTION IF EXISTS public.match_document_chunks(vector(768), float, integer, text);

CREATE OR REPLACE FUNCTION public.match_document_chunks (
  query_embedding vector(768),
  match_threshold float,
  match_count integer,
  department text
)
RETURNS TABLE (
  document_id uuid,
  chunk_id uuid,
  chunk_index integer,
  content text,
  similarity float,
  file_name text,
  doc_department text
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.document_id,
    dc.id AS chunk_id,
    dc.chunk_index,
    dc.content,
    (1 - (dc.embedding <=> query_embedding))::float AS similarity,
    dd.file_name,
    dd.department AS doc_department
  FROM public.document_chunks dc
  JOIN public.department_documents dd ON dc.document_id = dd.id
  WHERE dc.embedding IS NOT NULL
    AND (1 - (dc.embedding <=> query_embedding)) >= match_threshold
    AND lower(trim(dd.department)) = lower(trim(match_document_chunks.department))
  ORDER BY dc.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;
