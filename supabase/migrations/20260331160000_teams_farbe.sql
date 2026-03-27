-- Team-Farbe für Kalender-Ressourcen (Paket 5 Planung)
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS farbe text NOT NULL DEFAULT '#3b82f6';

COMMENT ON COLUMN public.teams.farbe IS 'Hex-Farbe für Kalenderzeilen und Einsatz-Events';
