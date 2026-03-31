CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'teamleiter',
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invitations
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.absences
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.subcontractors
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.agent_log
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

INSERT INTO public.organizations (id, name, slug)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Standard-Betrieb',
  'standard'
)
ON CONFLICT DO NOTHING;

UPDATE public.employees
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE public.projects
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE public.assignments
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE public.absences
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE public.subcontractors
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE public.teams
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE public.departments
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE public.agent_log
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE public.settings
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_employees_org
  ON public.employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_assignments_org
  ON public.assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_org
  ON public.projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_absences_org
  ON public.absences(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token
  ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_org
  ON public.invitations(organization_id);
