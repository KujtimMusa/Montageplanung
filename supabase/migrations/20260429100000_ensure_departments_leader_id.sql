-- Sicherstellen, dass departments.leader_id existiert (z. B. wenn ältere DB ohne 20260402120000).
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS leader_id uuid REFERENCES public.employees (id) ON DELETE SET NULL;
