-- Dienstleister (subcontractors): fehlende Kontext-Felder + Status
-- Einsätze: optionale Verknüpfung zu externem Partner

ALTER TABLE public.subcontractors
  ADD COLUMN IF NOT EXISTS website text;

ALTER TABLE public.subcontractors
  ADD COLUMN IF NOT EXISTS address text;

ALTER TABLE public.subcontractors
  ADD COLUMN IF NOT EXISTS status text;

UPDATE public.subcontractors
SET status = CASE WHEN active THEN 'aktiv' ELSE 'inaktiv' END
WHERE status IS NULL;

ALTER TABLE public.subcontractors
  ALTER COLUMN status SET DEFAULT 'aktiv';

ALTER TABLE public.subcontractors
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.subcontractors
  DROP CONSTRAINT IF EXISTS subcontractors_status_check;

ALTER TABLE public.subcontractors
  ADD CONSTRAINT subcontractors_status_check
  CHECK (status IN ('aktiv', 'inaktiv', 'partner'));

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS dienstleister_id uuid REFERENCES public.subcontractors (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assignments_dienstleister_id ON public.assignments (dienstleister_id)
  WHERE dienstleister_id IS NOT NULL;
