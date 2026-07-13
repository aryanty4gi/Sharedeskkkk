
-- 1) Clear legacy rows that have no owner
DELETE FROM public.research;
DELETE FROM public.deals;
DELETE FROM public.user_settings;
DELETE FROM public.templates;
DELETE FROM public.report_templates;

-- 2) Drop old open-to-everyone policies
DROP POLICY IF EXISTS "public all deals"            ON public.deals;
DROP POLICY IF EXISTS "public all templates"        ON public.templates;
DROP POLICY IF EXISTS "public all settings"         ON public.user_settings;
DROP POLICY IF EXISTS "public all research"         ON public.research;
DROP POLICY IF EXISTS "public all report_templates" ON public.report_templates;

-- 3) Add user_id (NOT NULL, defaults to current auth user, cascades on user delete)
ALTER TABLE public.deals            ADD COLUMN user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.templates        ADD COLUMN user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_settings    ADD COLUMN user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.research         ADD COLUMN user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.report_templates ADD COLUMN user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4) Helpful indexes
CREATE INDEX IF NOT EXISTS deals_user_id_idx            ON public.deals(user_id);
CREATE INDEX IF NOT EXISTS templates_user_id_idx        ON public.templates(user_id);
CREATE INDEX IF NOT EXISTS user_settings_user_id_idx    ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS research_user_id_idx         ON public.research(user_id);
CREATE INDEX IF NOT EXISTS report_templates_user_id_idx ON public.report_templates(user_id);

-- 5) Per-user RLS policies for each table
-- deals
CREATE POLICY "deals select own" ON public.deals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "deals insert own" ON public.deals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "deals update own" ON public.deals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "deals delete own" ON public.deals FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- templates
CREATE POLICY "templates select own" ON public.templates FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "templates insert own" ON public.templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "templates update own" ON public.templates FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "templates delete own" ON public.templates FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- user_settings
CREATE POLICY "settings select own" ON public.user_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "settings insert own" ON public.user_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "settings update own" ON public.user_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "settings delete own" ON public.user_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- research
CREATE POLICY "research select own" ON public.research FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "research insert own" ON public.research FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "research update own" ON public.research FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "research delete own" ON public.research FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- report_templates
CREATE POLICY "report_templates select own" ON public.report_templates FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "report_templates insert own" ON public.report_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "report_templates update own" ON public.report_templates FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "report_templates delete own" ON public.report_templates FOR DELETE TO authenticated USING (auth.uid() = user_id);
