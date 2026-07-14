CREATE OR REPLACE FUNCTION public.protect_profile_department()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.department IS DISTINCT FROM OLD.department THEN
    RAISE EXCEPTION 'Users cannot change their own department';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_department_trigger
ON public.profiles;

CREATE TRIGGER protect_profile_department_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_department();

REVOKE ALL ON FUNCTION public.protect_profile_department()
FROM PUBLIC, anon, authenticated;