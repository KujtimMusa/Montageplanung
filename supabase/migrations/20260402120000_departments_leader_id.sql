-- Optionale Abteilungsleitung (analog teams.leader_id)
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS leader_id uuid REFERENCES public.employees (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.departments.leader_id IS 'Optional: Stammdaten-Referenz auf Abteilungsleitung';
