-- Globale Positionsbibliothek (organization_id NULL), Standardfelder, Angebots-Gültigkeit

ALTER TABLE public.position_library
  ALTER COLUMN organization_id DROP NOT NULL;

ALTER TABLE public.position_library
  ADD COLUMN IF NOT EXISTS default_hours numeric(12, 2),
  ADD COLUMN IF NOT EXISTS default_unit text NOT NULL DEFAULT 'Std';

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS valid_until timestamptz;

DROP POLICY IF EXISTS "position_library_select" ON public.position_library;

CREATE POLICY "position_library_select" ON public.position_library
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    OR organization_id IS NULL
  );

NOTIFY pgrst, 'reload schema';
