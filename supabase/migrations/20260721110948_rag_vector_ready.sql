-- Enable the pgvector extension if it is not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Alter public.document_chunks by adding new vector-related columns
ALTER TABLE public.document_chunks
ADD COLUMN IF NOT EXISTS embedding vector(768),
ADD COLUMN IF NOT EXISTS embedding_model text,
ADD COLUMN IF NOT EXISTS embedded_at timestamptz;

-- Create an IVFFlat index on the embedding column for similarity search
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_ivfflat
ON public.document_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
