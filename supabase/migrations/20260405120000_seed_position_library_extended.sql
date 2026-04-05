-- Zusätzliche globale Positionsvorlagen (Bibliothek), idempotent per Name + organization_id IS NULL

-- Elektro (erweitert)
INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'RJ45-Netzwerkdose setzen', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Elektro' AND organization_id IS NULL LIMIT 1), 0.45, 'Stk', '{"stunden":0.45,"menge":0.45,"einheit":"Stk","stundensatz":65}'::jsonb, ARRAY['netzwerk','daten']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='RJ45-Netzwerkdose setzen' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'FI-/LS-Schalter einbauen', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Elektro' AND organization_id IS NULL LIMIT 1), 0.5, 'Stk', '{"stunden":0.5,"menge":0.5,"einheit":"Stk","stundensatz":65}'::jsonb, ARRAY['fi','sicherung']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='FI-/LS-Schalter einbauen' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Herdsanschluss / Starkstrom', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Elektro' AND organization_id IS NULL LIMIT 1), 2.0, 'Stk', '{"stunden":2.0,"menge":2.0,"einheit":"Stk","stundensatz":65}'::jsonb, ARRAY['herd','starkstrom']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Herdsanschluss / Starkstrom' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Rauchmelder installieren', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Elektro' AND organization_id IS NULL LIMIT 1), 0.35, 'Stk', '{"stunden":0.35,"menge":0.35,"einheit":"Stk","stundensatz":65}'::jsonb, ARRAY['rauchmelder']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Rauchmelder installieren' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Video-Gegensprechanlage (Basis)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Elektro' AND organization_id IS NULL LIMIT 1), 3.0, 'Stk', '{"stunden":3.0,"menge":3.0,"einheit":"Stk","stundensatz":65}'::jsonb, ARRAY['klingel','video']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Video-Gegensprechanlage (Basis)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Elektroinstallation Bad (Zone)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Elektro' AND organization_id IS NULL LIMIT 1), 4.0, 'Std', '{"stunden":4.0,"menge":4.0,"einheit":"Std","stundensatz":65}'::jsonb, ARRAY['bad','schutz']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Elektroinstallation Bad (Zone)' AND organization_id IS NULL);

-- Sanitär
INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Spülkasten reparieren / tauschen', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Sanitär' AND organization_id IS NULL LIMIT 1), 1.2, 'Stk', '{"stunden":1.2,"menge":1.2,"einheit":"Stk","stundensatz":65}'::jsonb, ARRAY['spülkasten','wc']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Spülkasten reparieren / tauschen' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Syphon / Ablauf montieren', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Sanitär' AND organization_id IS NULL LIMIT 1), 0.6, 'Stk', '{"stunden":0.6,"menge":0.6,"einheit":"Stk","stundensatz":65}'::jsonb, ARRAY['ablauf','siphon']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Syphon / Ablauf montieren' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Heizkörperventil tauschen', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Sanitär' AND organization_id IS NULL LIMIT 1), 1.0, 'Stk', '{"stunden":1.0,"menge":1.0,"einheit":"Stk","stundensatz":65}'::jsonb, ARRAY['ventil','heizung']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Heizkörperventil tauschen' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Abwasserleitung erneuern (je Meter)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Sanitär' AND organization_id IS NULL LIMIT 1), 0.5, 'm', '{"stunden":0.5,"menge":1,"einheit":"m","stundensatz":65}'::jsonb, ARRAY['abwasser','rohr']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Abwasserleitung erneuern (je Meter)' AND organization_id IS NULL);

-- Heizung
INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Heizungssteuerung programmieren', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Heizung' AND organization_id IS NULL LIMIT 1), 1.0, 'Std', '{"stunden":1.0,"menge":1.0,"einheit":"Std","stundensatz":65}'::jsonb, ARRAY['steuerung']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Heizungssteuerung programmieren' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Ausdehnungsgefäß tauschen', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Heizung' AND organization_id IS NULL LIMIT 1), 1.2, 'Stk', '{"stunden":1.2,"menge":1.2,"einheit":"Stk","stundensatz":65}'::jsonb, ARRAY['membran','druck']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Ausdehnungsgefäß tauschen' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Hydraulischer Abgleich dokumentieren', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Heizung' AND organization_id IS NULL LIMIT 1), 2.5, 'Std', '{"stunden":2.5,"menge":2.5,"einheit":"Std","stundensatz":65}'::jsonb, ARRAY['abgleich','heizung']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Hydraulischer Abgleich dokumentieren' AND organization_id IS NULL);

-- Trockenbau
INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Metall-Ständerwand (je m²)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Trockenbau' AND organization_id IS NULL LIMIT 1), 0.45, 'm²', '{"stunden":0.45,"menge":1,"einheit":"m²","stundensatz":55}'::jsonb, ARRAY['ständer','wand']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Metall-Ständerwand (je m²)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Fensterlaibung verputzen GK (je Stk)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Trockenbau' AND organization_id IS NULL LIMIT 1), 0.5, 'Stk', '{"stunden":0.5,"menge":0.5,"einheit":"Stk","stundensatz":55}'::jsonb, ARRAY['fenster','laibung']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Fensterlaibung verputzen GK (je Stk)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Schallschutzdecke System (je m²)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Trockenbau' AND organization_id IS NULL LIMIT 1), 0.9, 'm²', '{"stunden":0.9,"menge":1,"einheit":"m²","stundensatz":55}'::jsonb, ARRAY['schall','decke']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Schallschutzdecke System (je m²)' AND organization_id IS NULL);

-- Maler
INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Grundierung Wand (je m²)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Maler & Lackierer' AND organization_id IS NULL LIMIT 1), 0.08, 'm²', '{"stunden":0.08,"menge":1,"einheit":"m²","stundensatz":50}'::jsonb, ARRAY['grundierung']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Grundierung Wand (je m²)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Lasur Holzdecke (je m²)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Maler & Lackierer' AND organization_id IS NULL LIMIT 1), 0.18, 'm²', '{"stunden":0.18,"menge":1,"einheit":"m²","stundensatz":50}'::jsonb, ARRAY['lasur','holz']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Lasur Holzdecke (je m²)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Farbwechsel Akzentwand (je m²)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Maler & Lackierer' AND organization_id IS NULL LIMIT 1), 0.2, 'm²', '{"stunden":0.2,"menge":1,"einheit":"m²","stundensatz":50}'::jsonb, ARRAY['akzent','farbe']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Farbwechsel Akzentwand (je m²)' AND organization_id IS NULL);

-- Fliesen
INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Bodengleiche Dusche abdichten', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Fliesen' AND organization_id IS NULL LIMIT 1), 3.5, 'Stk', '{"stunden":3.5,"menge":3.5,"einheit":"Stk","stundensatz":60}'::jsonb, ARRAY['dusche','abdichtung']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Bodengleiche Dusche abdichten' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Großformat-Fliese verlegen (je m²)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Fliesen' AND organization_id IS NULL LIMIT 1), 1.2, 'm²', '{"stunden":1.2,"menge":1,"einheit":"m²","stundensatz":60}'::jsonb, ARRAY['großformat']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Großformat-Fliese verlegen (je m²)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Silikonfugen erneuern (je lfm)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Fliesen' AND organization_id IS NULL LIMIT 1), 0.15, 'lfm', '{"stunden":0.15,"menge":1,"einheit":"lfm","stundensatz":60}'::jsonb, ARRAY['silikon','fuge']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Silikonfugen erneuern (je lfm)' AND organization_id IS NULL);

-- Allgemein
INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Baustelleneinrichtung / Absperrung', 'pauschal', (SELECT id FROM public.trade_categories WHERE name='Allgemein / Sonstiges' AND organization_id IS NULL LIMIT 1), NULL, 'Psch', '{"beschreibung":"Einrichtung und Absperrung Baustelle","betrag":0}'::jsonb, ARRAY['einrichtung']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Baustelleneinrichtung / Absperrung' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Behörden- / TÜV-Termin begleiten', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Allgemein / Sonstiges' AND organization_id IS NULL LIMIT 1), 2.0, 'Std', '{"stunden":2.0,"menge":2.0,"einheit":"Std","stundensatz":75}'::jsonb, ARRAY['termin','behörde']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Behörden- / TÜV-Termin begleiten' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Digitale Übergabe / Fotodokumentation', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Allgemein / Sonstiges' AND organization_id IS NULL LIMIT 1), 1.0, 'Std', '{"stunden":1.0,"menge":1.0,"einheit":"Std","stundensatz":65}'::jsonb, ARRAY['doku','übergabe']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Digitale Übergabe / Fotodokumentation' AND organization_id IS NULL);
