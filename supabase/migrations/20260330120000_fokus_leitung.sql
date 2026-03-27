-- Fokus Leitung: optionales Projekt pro Einsatz, Team-Rollen in team_members

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS team_role text NOT NULL DEFAULT 'mitglied';

ALTER TABLE public.team_members
  DROP CONSTRAINT IF EXISTS team_members_team_role_check;

ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_team_role_check
  CHECK (team_role IN ('teamleiter', 'mitglied'));

ALTER TABLE public.assignments
  ALTER COLUMN project_id DROP NOT NULL;

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS project_title text;

COMMENT ON COLUMN public.assignments.project_title IS 'Freitext-Titel, wenn kein Eintrag in projects verknüpft ist';
