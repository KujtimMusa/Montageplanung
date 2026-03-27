-- Zentrale Key/Value-Einstellungen (Integrationen, Automatisierungen, …)
CREATE TABLE IF NOT EXISTS public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settings_key ON public.settings (key);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_authenticated_select"
  ON public.settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "settings_authenticated_insert"
  ON public.settings FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "settings_authenticated_update"
  ON public.settings FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "settings_authenticated_delete"
  ON public.settings FOR DELETE TO authenticated
  USING (true);

COMMENT ON TABLE public.settings IS 'App-weite Konfiguration (Key/Value)';
