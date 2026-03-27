-- Stammdaten-Spalten auf employees (idempotent).
-- Behebt Remote-DBs ohne Migration 20260331190000 sowie veralteten PostgREST-Schema-Cache.
-- Reihenfolge: Tabelle teams existiert bereits (Initialschema).

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS qualifikationen text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams (id) ON DELETE SET NULL;

-- PostgREST neu laden (hilft bei „schema cache“-Fehlern)
NOTIFY pgrst, 'reload schema';
