CREATE TABLE public.department_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  file_size BIGINT,
  file_mime TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.department_documents TO authenticated;
GRANT ALL ON public.department_documents TO service_role;

ALTER TABLE public.department_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Department members can view department documents"
ON public.department_documents
FOR SELECT
TO authenticated
USING (
  lower(trim(department)) = (
    SELECT lower(trim(p.department))
    FROM public.profiles p
    WHERE p.id = auth.uid()
  )
);

CREATE POLICY "Department members can upload department documents"
ON public.department_documents
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND lower(trim(department)) = (
    SELECT lower(trim(p.department))
    FROM public.profiles p
    WHERE p.id = auth.uid()
  )
);

CREATE POLICY "Users can delete own department documents"
ON public.department_documents
FOR DELETE
TO authenticated
USING (
  uploaded_by = auth.uid()
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('department-documents', 'department-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Department members can read department storage"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'department-documents'
  AND lower((storage.foldername(name))[1]) = (
    SELECT lower(trim(p.department))
    FROM public.profiles p
    WHERE p.id = auth.uid()
  )
);

CREATE POLICY "Department members can upload department storage"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'department-documents'
  AND lower((storage.foldername(name))[1]) = (
    SELECT lower(trim(p.department))
    FROM public.profiles p
    WHERE p.id = auth.uid()
  )
);

CREATE POLICY "Users can delete own department storage"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'department-documents'
  AND owner_id = auth.uid()::text
);