DROP POLICY IF EXISTS "public read logos" ON storage.objects;
DROP POLICY IF EXISTS "public write logos" ON storage.objects;
DROP POLICY IF EXISTS "public update logos" ON storage.objects;
DROP POLICY IF EXISTS "public delete logos" ON storage.objects;

CREATE POLICY "authenticated read logos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'logos');

CREATE POLICY "authenticated write logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logos');

CREATE POLICY "authenticated update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'logos')
WITH CHECK (bucket_id = 'logos');

CREATE POLICY "authenticated delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'logos');