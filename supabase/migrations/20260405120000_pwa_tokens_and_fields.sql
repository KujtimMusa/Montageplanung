-- PWA: Tokens, Zeiterfassung, Baudokumentation, Kunden-Nachrichten, Storage

-- ============================================
-- 1. PWA-Token für Mitarbeiter
-- ============================================
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS pwa_token uuid DEFAULT gen_random_uuid();

UPDATE public.employees
SET pwa_token = gen_random_uuid()
WHERE pwa_token IS NULL;

ALTER TABLE public.employees
  ALTER COLUMN pwa_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS employees_pwa_token_key
  ON public.employees (pwa_token);

-- ============================================
-- 2. Kunden-Token für Projekte
-- ============================================
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS customer_token uuid DEFAULT gen_random_uuid();

UPDATE public.projects
SET customer_token = gen_random_uuid()
WHERE customer_token IS NULL;

ALTER TABLE public.projects
  ALTER COLUMN customer_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS projects_customer_token_key
  ON public.projects (customer_token);

-- ============================================
-- 3. Zeiterfassung
-- ============================================
CREATE TABLE IF NOT EXISTS public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees (id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES public.assignments (id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  checkin_at timestamptz NOT NULL DEFAULT now(),
  checkout_at timestamptz,
  checkin_lat double precision,
  checkin_lng double precision,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "time_entries_select" ON public.time_entries
  FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "time_entries_insert" ON public.time_entries
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "time_entries_update" ON public.time_entries
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_my_org_id())
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "time_entries_delete" ON public.time_entries
  FOR DELETE TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE INDEX IF NOT EXISTS idx_time_entries_employee ON public.time_entries (employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_assignment ON public.time_entries (assignment_id);

ALTER TABLE public.time_entries REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.time_entries;

-- ============================================
-- 4. Baudokumentation
-- ============================================
CREATE TABLE IF NOT EXISTS public.site_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES public.assignments (id) ON DELETE SET NULL,
  employee_id uuid NOT NULL REFERENCES public.employees (id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN (
    'foto_vorher', 'foto_nachher', 'foto_problem', 'foto_sonstiges',
    'notiz', 'anweisung', 'dokument'
  )),
  title text,
  content text,
  file_url text,
  file_name text,
  file_size_kb integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.site_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_docs_select" ON public.site_docs
  FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "site_docs_insert" ON public.site_docs
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "site_docs_update" ON public.site_docs
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_my_org_id())
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "site_docs_delete" ON public.site_docs
  FOR DELETE TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE INDEX IF NOT EXISTS idx_site_docs_project ON public.site_docs (project_id);
CREATE INDEX IF NOT EXISTS idx_site_docs_assignment ON public.site_docs (assignment_id);

-- ============================================
-- 5. Kunden-Nachrichten
-- ============================================
CREATE TABLE IF NOT EXISTS public.customer_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  author_type text NOT NULL CHECK (author_type IN ('kunde', 'koordinator')),
  author_name text,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.customer_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_messages_select" ON public.customer_messages
  FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "customer_messages_insert" ON public.customer_messages
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "customer_messages_update" ON public.customer_messages
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_my_org_id())
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "customer_messages_delete" ON public.customer_messages
  FOR DELETE TO authenticated
  USING (organization_id = public.get_my_org_id());

-- ============================================
-- 6. Storage Bucket
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-docs',
  'site-docs',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "site_docs_upload" ON storage.objects;
DROP POLICY IF EXISTS "site_docs_read" ON storage.objects;

CREATE POLICY "site_docs_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-docs');

CREATE POLICY "site_docs_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'site-docs');

NOTIFY pgrst, 'reload schema';
