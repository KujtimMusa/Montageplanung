-- Realtime für Dashboard-Refresh (projects; assignments bereits in 20260327120001)
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
