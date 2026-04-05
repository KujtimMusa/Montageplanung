-- Kalkulation & Angebote: Gewerke-Hierarchie, Kalkulationen, Positionen, Bibliothek, Angebote, Templates
-- Hinweis: Ergänzend optional time_entries.calculation_position_id für Ist-Zuordnung (Lernschleife).

-- ============================================
-- 1) Gewerke (hierarchisch, pro Organisation)
-- ============================================
CREATE TABLE IF NOT EXISTS public.trade_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.trade_categories (id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trade_categories_org ON public.trade_categories (organization_id);
CREATE INDEX IF NOT EXISTS idx_trade_categories_parent ON public.trade_categories (parent_id);

-- ============================================
-- 2) Kalkulations-Header
-- ============================================
CREATE TABLE IF NOT EXISTS public.calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers (id) ON DELETE SET NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'entwurf'
    CHECK (status IN ('entwurf', 'aktiv', 'archiviert')),
  margin_target_percent numeric(5, 2),
  quick_mode boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid REFERENCES public.employees (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calculations_org ON public.calculations (organization_id);
CREATE INDEX IF NOT EXISTS idx_calculations_project ON public.calculations (project_id);
CREATE INDEX IF NOT EXISTS idx_calculations_customer ON public.calculations (customer_id);

-- ============================================
-- 3) Kalkulationspositionen (polymorph über position_type + details jsonb)
-- ============================================
CREATE TABLE IF NOT EXISTS public.calculation_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  calculation_id uuid NOT NULL REFERENCES public.calculations (id) ON DELETE CASCADE,
  trade_category_id uuid REFERENCES public.trade_categories (id) ON DELETE SET NULL,
  position_type text NOT NULL
    CHECK (position_type IN ('arbeit', 'material', 'pauschal', 'fremdleistung', 'nachlass')),
  sort_order int NOT NULL DEFAULT 0,
  title text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Denormalisierte Summe netto (optional); UI kann live aus details berechnen
  line_total_net numeric(14, 2),
  library_item_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calculation_positions_calc ON public.calculation_positions (calculation_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_calculation_positions_org ON public.calculation_positions (organization_id);
CREATE INDEX IF NOT EXISTS idx_calculation_positions_trade ON public.calculation_positions (trade_category_id);

COMMENT ON COLUMN public.calculation_positions.details IS
  'Typ-spezifische Felder, z. B. arbeit: {gewerk,taetigkeit,menge,einheit,stundensatz}; material: {artikelnummer,ek,menge,aufschlag_pct,vk}; nachlass: {mode: pct|fix, value}';

COMMENT ON COLUMN public.calculation_positions.library_item_id IS
  'Optional: Verweis auf position_library.id nach Import aus Bibliothek';

-- ============================================
-- 4) Positionsbibliothek (Stammdaten)
-- ============================================
CREATE TABLE IF NOT EXISTS public.position_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  trade_category_id uuid REFERENCES public.trade_categories (id) ON DELETE SET NULL,
  position_type text NOT NULL
    CHECK (position_type IN ('arbeit', 'material', 'pauschal', 'fremdleistung', 'nachlass')),
  name text NOT NULL,
  default_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  usage_count int NOT NULL DEFAULT 0,
  source_project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_position_library_org ON public.position_library (organization_id);
CREATE INDEX IF NOT EXISTS idx_position_library_trade ON public.position_library (trade_category_id);
CREATE INDEX IF NOT EXISTS idx_position_library_tags ON public.position_library USING gin (tags);

-- FK von calculation_positions.library_item_id nachträglich (Zirkelvermeidung)
ALTER TABLE public.calculation_positions
  DROP CONSTRAINT IF EXISTS calculation_positions_library_item_id_fkey;

ALTER TABLE public.calculation_positions
  ADD CONSTRAINT calculation_positions_library_item_id_fkey
  FOREIGN KEY (library_item_id) REFERENCES public.position_library (id) ON DELETE SET NULL;

-- ============================================
-- 5) Angebote (Versionierung über parent_offer_id + version)
-- ============================================
CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  calculation_id uuid NOT NULL REFERENCES public.calculations (id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers (id) ON DELETE SET NULL,
  version int NOT NULL DEFAULT 1,
  parent_offer_id uuid REFERENCES public.offers (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'entwurf'
    CHECK (status IN (
      'entwurf', 'versendet', 'in_pruefung', 'angenommen', 'abgelehnt', 'auftrag'
    )),
  template_key text,
  intro_text text,
  aggregate_by_trade boolean NOT NULL DEFAULT false,
  pdf_storage_path text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz,
  decided_at timestamptz,
  created_by uuid REFERENCES public.employees (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (calculation_id, version)
);

CREATE INDEX IF NOT EXISTS idx_offers_org ON public.offers (organization_id);
CREATE INDEX IF NOT EXISTS idx_offers_calc ON public.offers (calculation_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers (organization_id, status);

COMMENT ON COLUMN public.offers.calculation_id IS
  'Pflicht: jedes Angebot gehört zu genau einer Kalkulation (FK offers_calculation_id_fkey auf public.calculations).';

-- ============================================
-- 6) Angebots-Templates / Textbausteine
-- ============================================
CREATE TABLE IF NOT EXISTS public.offer_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  slug text NOT NULL,
  category text NOT NULL
    CHECK (category IN (
      'deckblatt', 'leistung', 'zahlungsbedingungen', 'gewaehrleistung',
      'gueltigkeit', 'ausschluesse', 'agb', 'fusszeile', 'sonstiges'
    )),
  title text NOT NULL,
  body text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_offer_templates_org ON public.offer_templates (organization_id);

-- ============================================
-- 7) Zeiterfassung ↔ Kalkulationsposition (optional, für Ist-Zuordnung & Historik-Matching)
-- ============================================
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS calculation_position_id uuid
    REFERENCES public.calculation_positions (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_time_entries_calc_pos
  ON public.time_entries (calculation_position_id)
  WHERE calculation_position_id IS NOT NULL;

-- ============================================
-- 8) Projekt-Scope (MVP: Verknüpfung Projekt ↔ Kalkulationsposition, Planung)
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_scope_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  calculation_position_id uuid REFERENCES public.calculation_positions (id) ON DELETE SET NULL,
  trade_category_id uuid REFERENCES public.trade_categories (id) ON DELETE SET NULL,
  title text NOT NULL,
  planned_hours numeric(12, 2),
  responsible_employee_id uuid REFERENCES public.employees (id) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'offen'
    CHECK (status IN ('offen', 'in_bearbeitung', 'abgeschlossen', 'ueberschritten')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_scope_items_org ON public.project_scope_items (organization_id);
CREATE INDEX IF NOT EXISTS idx_project_scope_items_project ON public.project_scope_items (project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_project_scope_items_calc_pos ON public.project_scope_items (calculation_position_id);

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.trade_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculation_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.position_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_scope_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trade_categories_select" ON public.trade_categories
  FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "trade_categories_insert" ON public.trade_categories
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "trade_categories_update" ON public.trade_categories
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_my_org_id())
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "trade_categories_delete" ON public.trade_categories
  FOR DELETE TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "calculations_select" ON public.calculations
  FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "calculations_insert" ON public.calculations
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "calculations_update" ON public.calculations
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_my_org_id())
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "calculations_delete" ON public.calculations
  FOR DELETE TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "calculation_positions_select" ON public.calculation_positions
  FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "calculation_positions_insert" ON public.calculation_positions
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "calculation_positions_update" ON public.calculation_positions
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_my_org_id())
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "calculation_positions_delete" ON public.calculation_positions
  FOR DELETE TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "position_library_select" ON public.position_library
  FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "position_library_insert" ON public.position_library
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "position_library_update" ON public.position_library
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_my_org_id())
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "position_library_delete" ON public.position_library
  FOR DELETE TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "offers_select" ON public.offers
  FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "offers_insert" ON public.offers
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "offers_update" ON public.offers
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_my_org_id())
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "offers_delete" ON public.offers
  FOR DELETE TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "offer_templates_select" ON public.offer_templates
  FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "offer_templates_insert" ON public.offer_templates
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "offer_templates_update" ON public.offer_templates
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_my_org_id())
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "offer_templates_delete" ON public.offer_templates
  FOR DELETE TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "project_scope_items_select" ON public.project_scope_items
  FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "project_scope_items_insert" ON public.project_scope_items
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "project_scope_items_update" ON public.project_scope_items
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_my_org_id())
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "project_scope_items_delete" ON public.project_scope_items
  FOR DELETE TO authenticated
  USING (organization_id = public.get_my_org_id());

NOTIFY pgrst, 'reload schema';
