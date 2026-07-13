
-- Templates: schema-driven (parameters/formulas/outputs as JSONB)
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  icon TEXT,
  color_theme TEXT DEFAULT 'orange',
  parameters JSONB NOT NULL DEFAULT '[]'::jsonb,
  returns JSONB NOT NULL DEFAULT '[]'::jsonb,
  formulas JSONB NOT NULL DEFAULT '[]'::jsonb,
  outputs JSONB NOT NULL DEFAULT '[]'::jsonb,
  scenarios JSONB NOT NULL DEFAULT '{"conservative":0.75,"expected":1,"optimistic":1.25}'::jsonb,
  is_builtin BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deals: auto-saved per session (state of calculator)
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Untitled Deal',
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  prospect_company TEXT,
  prospect_logo_url TEXT,
  color_theme TEXT DEFAULT 'orange',
  scenario TEXT NOT NULL DEFAULT 'expected',
  values JSONB NOT NULL DEFAULT '{}'::jsonb,
  template_snapshot JSONB,
  ai_summary TEXT,
  ai_talking_points JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Research: company intel linked to deals
CREATE TABLE public.research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'fast',
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  sources JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Single-row settings table for personal defaults
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT,
  product_description TEXT,
  default_currency TEXT DEFAULT 'USD',
  default_template_id UUID,
  scenario_multipliers JSONB DEFAULT '{"conservative":0.75,"expected":1,"optimistic":1.25}'::jsonb,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_templates_touch BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_deals_touch BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_settings_touch BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS — public read/write (single-user personal tool, no auth)
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public all templates" ON public.templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all deals" ON public.deals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all research" ON public.research FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all settings" ON public.user_settings FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket for prospect logos
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "public write logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos');
CREATE POLICY "public update logos" ON storage.objects FOR UPDATE USING (bucket_id = 'logos');
CREATE POLICY "public delete logos" ON storage.objects FOR DELETE USING (bucket_id = 'logos');
