-- Test-/Startdaten: Standard-Abteilungen (nur wenn noch keine Zeilen existieren)
INSERT INTO public.departments (name, color, icon)
SELECT v.name, v.color, v.icon
FROM (
  VALUES
    ('Elektro', '#3B82F6', 'Zap'),
    ('SHK', '#0EA5E9', 'Droplets'),
    ('DC', '#8B5CF6', 'Sun'),
    ('AC', '#F59E0B', 'Wind'),
    ('Gerüst', '#64748B', 'Layers'),
    ('Fundament', '#78716C', 'BrickWall')
) AS v(name, color, icon)
WHERE NOT EXISTS (SELECT 1 FROM public.departments LIMIT 1);
