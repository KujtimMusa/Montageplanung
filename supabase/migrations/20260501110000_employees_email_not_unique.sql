ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_email_key;

CREATE INDEX IF NOT EXISTS idx_employees_email
  ON public.employees (email);

CREATE INDEX IF NOT EXISTS idx_employees_org_email
  ON public.employees (organization_id, email);
