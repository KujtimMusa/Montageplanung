-- Allow planning despite conflicts:
-- Overlap conflicts should be warnings in UI, not hard DB blockers.
-- We drop the exclusion constraint on assignments so emergency re-planning can still be saved.

ALTER TABLE public.assignments
  DROP CONSTRAINT IF EXISTS assignments_keine_ueberlappung;

