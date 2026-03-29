-- Mehrere Abteilungen pro Mitarbeiter (Pivot); employees.department_id bleibt als Primär-Spiegel.
CREATE TABLE IF NOT EXISTS public.employee_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees (id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.departments (id) ON DELETE CASCADE,
  ist_primaer boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_departments_employee
  ON public.employee_departments (employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_departments_department
  ON public.employee_departments (department_id);

COMMENT ON TABLE public.employee_departments IS 'n:m Mitarbeiter ↔ Abteilung; ist_primaer spiegelt die Haupt-Abteilung (employees.department_id).';

-- Bestehende department_id übernehmen
INSERT INTO public.employee_departments (employee_id, department_id, ist_primaer)
SELECT id, department_id, true
FROM public.employees
WHERE department_id IS NOT NULL
ON CONFLICT (employee_id, department_id) DO NOTHING;

ALTER TABLE public.employee_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employee_departments_select_auth"
  ON public.employee_departments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "employee_departments_insert_auth"
  ON public.employee_departments FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "employee_departments_update_auth"
  ON public.employee_departments FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "employee_departments_delete_auth"
  ON public.employee_departments FOR DELETE TO authenticated
  USING (true);
