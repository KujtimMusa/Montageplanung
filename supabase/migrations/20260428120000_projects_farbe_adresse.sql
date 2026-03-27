-- Projektfarbe & Baustellenadresse für Kalender-Pills und Popover
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS farbe text;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS adresse text;

COMMENT ON COLUMN public.projects.farbe IS 'Hex-Farbe (#rrggbb) für Einsatz-Pills im Kalender';
COMMENT ON COLUMN public.projects.adresse IS 'Optional: Baustellenadresse (Anzeige im Popover)';

NOTIFY pgrst, 'reload schema';
