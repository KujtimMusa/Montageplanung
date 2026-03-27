-- Optionales Team pro Einsatz (Label im Kalender)
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assignments_team_id ON public.assignments (team_id)
  WHERE team_id IS NOT NULL;
