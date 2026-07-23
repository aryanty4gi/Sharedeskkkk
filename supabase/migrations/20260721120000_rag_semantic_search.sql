-- ===========================================================
-- ShareDesk Workplace
-- RAG Semantic Search Retrieval Function
-- ===========================================================

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
  similarity float
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
    (1 - (dc.embedding <=> query_embedding))::float AS similarity
  from public.document_chunks dc
  join public.department_documents dd on dc.document_id = dd.id
  where dc.embedding is not null
    and (1 - (dc.embedding <=> query_embedding)) >= match_threshold
    and lower(trim(dd.department)) = lower(trim(department))
  order by dc.embedding <=> query_embedding ASC
  limit match_count;
END;
$$;
