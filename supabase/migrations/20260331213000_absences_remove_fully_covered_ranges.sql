-- Entfernt Abwesenheiten, die komplett innerhalb eines längeren
-- Eintrags mit gleichem Mitarbeiter und Typ liegen.
DELETE FROM public.absences
WHERE id IN (
  SELECT a.id
  FROM public.absences a
  JOIN public.absences b
    ON a.employee_id = b.employee_id
    AND a.absence_type = b.absence_type
    AND a.id != b.id
    AND a.start_date >= b.start_date
    AND a.end_date <= b.end_date
    AND (b.end_date - b.start_date) > (a.end_date - a.start_date)
);
