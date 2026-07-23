-- ===========================================================
-- ShareDesk Workplace
-- RAG Foundation Migration (Phase 1)
-- ===========================================================

-- Documents uploaded into the knowledge base
create table if not exists public.documents (
    id uuid primary key default gen_random_uuid(),

    title text not null,
    file_name text not null,
    mime_type text,
    storage_path text not null,

    uploaded_by uuid references auth.users(id) on delete set null,

    department_id uuid references public.departments(id) on delete set null,

    status text not null default 'processing'
        check (status in ('processing','ready','failed')),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Text chunks extracted from each document
create table if not exists public.document_chunks (
    id uuid primary key default gen_random_uuid(),

    document_id uuid not null
        references public.documents(id)
        on delete cascade,

    chunk_index integer not null,

    content text not null,

    token_count integer,

    page_number integer,

    created_at timestamptz not null default now()
);

create index if not exists idx_documents_department
on public.documents(department_id);

create index if not exists idx_document_chunks_document
on public.document_chunks(document_id);

create index if not exists idx_document_chunks_order
on public.document_chunks(document_id, chunk_index);

alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;

create policy "Authenticated users can read documents"
on public.documents
for select
to authenticated
using (true);

create policy "Authenticated users can read chunks"
on public.document_chunks
for select
to authenticated
using (true);