UPDATE public.employees
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

ALTER TABLE public.employees
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.projects
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.assignments
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.absences
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.subcontractors
  ALTER COLUMN organization_id SET NOT NULL;
