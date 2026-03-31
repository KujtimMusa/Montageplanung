ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS betrieb_name text,
  ADD COLUMN IF NOT EXISTS betrieb_strasse text,
  ADD COLUMN IF NOT EXISTS betrieb_plz text,
  ADD COLUMN IF NOT EXISTS betrieb_ort text,
  ADD COLUMN IF NOT EXISTS betrieb_telefon text,
  ADD COLUMN IF NOT EXISTS betrieb_email text,
  ADD COLUMN IF NOT EXISTS betrieb_logo_url text,
  ADD COLUMN IF NOT EXISTS arbeitszeit_start text NOT NULL DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS arbeitszeit_ende text NOT NULL DEFAULT '17:00',
  ADD COLUMN IF NOT EXISTS urlaubstage_pro_jahr int NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS schichtmodell text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS feiertag_bundesland text NOT NULL DEFAULT 'NW';
