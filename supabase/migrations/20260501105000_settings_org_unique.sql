UPDATE public.settings
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

ALTER TABLE public.settings
  ALTER COLUMN organization_id SET DEFAULT public.get_my_org_id();

ALTER TABLE public.settings
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.settings
  DROP CONSTRAINT IF EXISTS settings_key_key;

DROP INDEX IF EXISTS idx_settings_key;

CREATE UNIQUE INDEX IF NOT EXISTS settings_org_key_unique
  ON public.settings (organization_id, key);

CREATE INDEX IF NOT EXISTS idx_settings_key
  ON public.settings (key);
