DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'absences_employee_date_type_unique'
  ) THEN
    ALTER TABLE public.absences
      ADD CONSTRAINT absences_employee_date_type_unique
      UNIQUE (employee_id, start_date, absence_type);
  END IF;
END $$;
