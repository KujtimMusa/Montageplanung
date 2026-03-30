-- 1) Kompatibilitaet: absence_type fuer neue Flows bereitstellen
ALTER TABLE public.absences
  ADD COLUMN IF NOT EXISTS absence_type text;

-- Backfill aus legacy-Spalte "type"
UPDATE public.absences
SET absence_type = COALESCE(NULLIF(absence_type, ''), type)
WHERE absence_type IS NULL OR absence_type = '';

ALTER TABLE public.absences
  ALTER COLUMN absence_type SET NOT NULL;

-- 2) Duplikate bereinigen (behalte aeltesten Eintrag)
DELETE FROM public.absences a
USING public.absences b
WHERE a.employee_id = b.employee_id
  AND a.start_date = b.start_date
  AND a.absence_type = b.absence_type
  AND (
    a.created_at > b.created_at
    OR (a.created_at = b.created_at AND a.id::text > b.id::text)
  );

-- 3) Echte Duplikate verhindern
ALTER TABLE public.absences
  ADD CONSTRAINT absences_employee_date_type_unique
  UNIQUE (employee_id, start_date, absence_type);

