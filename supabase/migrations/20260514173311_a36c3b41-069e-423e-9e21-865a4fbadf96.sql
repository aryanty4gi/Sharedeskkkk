ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS brand_logo_url text,
  ADD COLUMN IF NOT EXISTS brand_primary_color text DEFAULT '#0F0F0F',
  ADD COLUMN IF NOT EXISTS brand_tagline text;

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS report jsonb;