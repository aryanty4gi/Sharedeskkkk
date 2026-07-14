CREATE OR REPLACE FUNCTION public.protect_profile_department()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'authenticated'
     AND NEW.department IS DISTINCT FROM OLD.department THEN
    RAISE EXCEPTION 'Users cannot change their own department';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_profile_department()
FROM PUBLIC, anon, authenticated;