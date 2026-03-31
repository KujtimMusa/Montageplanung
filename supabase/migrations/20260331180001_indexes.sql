-- Indexes für häufige Abfragen + Datenintegritäts-Constraints

CREATE INDEX IF NOT EXISTS idx_assignments_date
  ON public.assignments (date);

CREATE INDEX IF NOT EXISTS idx_assignments_employee_date
  ON public.assignments (employee_id, date);

CREATE INDEX IF NOT EXISTS idx_absences_range
  ON public.absences (employee_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_absences_status
  ON public.absences (status);

CREATE INDEX IF NOT EXISTS idx_agent_log_typ_zeit
  ON public.agent_log (agent_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_projects_status
  ON public.projects (status);

CREATE INDEX IF NOT EXISTS idx_employees_active_role
  ON public.employees (active, role);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_assignment_times'
  ) THEN
    ALTER TABLE public.assignments
      ADD CONSTRAINT chk_assignment_times
      CHECK (end_time > start_time) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_absence_dates'
  ) THEN
    ALTER TABLE public.absences
      ADD CONSTRAINT chk_absence_dates
      CHECK (end_date >= start_date) NOT VALID;
  END IF;
END $$;
