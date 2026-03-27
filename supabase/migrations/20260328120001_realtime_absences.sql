-- Realtime für Abwesenheiten (Kalender-Hintergründe live aktualisieren)
ALTER TABLE public.absences REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.absences;
