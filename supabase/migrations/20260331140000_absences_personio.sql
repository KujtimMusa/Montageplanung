-- Personio / Quelle für Abwesenheiten
ALTER TABLE public.absences
  ADD COLUMN IF NOT EXISTS quelle text NOT NULL DEFAULT 'manuell';

ALTER TABLE public.absences
  ADD COLUMN IF NOT EXISTS personio_id text;

CREATE UNIQUE INDEX IF NOT EXISTS absences_personio_id_key
  ON public.absences (personio_id)
  WHERE personio_id IS NOT NULL;

COMMENT ON COLUMN public.absences.quelle IS 'manuell | personio';
COMMENT ON COLUMN public.absences.personio_id IS 'Eindeutige ID aus Personio (falls Sync)';
