-- Optionale Einsatz-Priorität (UI: niedrig | mittel | hoch | kritisch)
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS prioritaet text;

COMMENT ON COLUMN public.assignments.prioritaet IS 'Optional: niedrig | mittel | hoch | kritisch';
