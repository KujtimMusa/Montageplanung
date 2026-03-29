-- Partner-Einsätze: kein gebundener interner Mitarbeiter nötig.
-- Überlappung nur noch prüfen, wenn employee_id gesetzt ist (echte Person).

ALTER TABLE public.assignments DROP CONSTRAINT IF EXISTS assignments_keine_ueberlappung;

ALTER TABLE public.assignments ALTER COLUMN employee_id DROP NOT NULL;

ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_keine_ueberlappung EXCLUDE USING gist (
    employee_id WITH =,
    tsrange(
      (date + start_time)::timestamp,
      (date + end_time)::timestamp,
      '[)'
    ) WITH &&
  )
  WHERE (employee_id IS NOT NULL);

COMMENT ON COLUMN public.assignments.employee_id IS
  'Bei Team-Einsätzen: Vertreter im System. Bei reinem Partner-Einsatz (dienstleister_id): NULL.';
