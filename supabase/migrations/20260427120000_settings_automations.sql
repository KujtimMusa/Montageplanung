-- Automatisierungen als Spalten auf settings (Singleton-Zeile key = 'app')

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS automation_krankmeldung boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS automation_neuer_einsatz boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS automation_projekt_ueberfaellig boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS automation_dienstleister_absage boolean NOT NULL DEFAULT false;

INSERT INTO public.settings (
  key,
  value,
  automation_krankmeldung,
  automation_neuer_einsatz,
  automation_projekt_ueberfaellig,
  automation_dienstleister_absage
)
VALUES ('app', 'config', false, false, false, false)
ON CONFLICT (key) DO NOTHING;

COMMENT ON COLUMN public.settings.automation_krankmeldung IS 'Krankmeldung → Notfall-Kontext';
COMMENT ON COLUMN public.settings.automation_neuer_einsatz IS 'Neuer Einsatz → Benachrichtigung';
COMMENT ON COLUMN public.settings.automation_projekt_ueberfaellig IS 'Projekt überfällig → Hinweis';
COMMENT ON COLUMN public.settings.automation_dienstleister_absage IS 'DL inaktiv → Notfall-Kontext';
