-- Globale Gewerke + Positionsbibliothek (organization_id NULL)
-- Voraussetzung: position_library.organization_id nullable (Migration 20260501150000)

ALTER TABLE public.trade_categories
  ALTER COLUMN organization_id DROP NOT NULL;

DROP POLICY IF EXISTS "trade_categories_select" ON public.trade_categories;

CREATE POLICY "trade_categories_select" ON public.trade_categories
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    OR organization_id IS NULL
  );

-- Gewerke (global)
INSERT INTO public.trade_categories (name, is_active, organization_id, sort_order)
SELECT 'Elektro', true, NULL, 0
WHERE NOT EXISTS (SELECT 1 FROM public.trade_categories t WHERE t.name = 'Elektro' AND t.organization_id IS NULL);

INSERT INTO public.trade_categories (name, is_active, organization_id, sort_order)
SELECT 'Sanitär', true, NULL, 0
WHERE NOT EXISTS (SELECT 1 FROM public.trade_categories t WHERE t.name = 'Sanitär' AND t.organization_id IS NULL);

INSERT INTO public.trade_categories (name, is_active, organization_id, sort_order)
SELECT 'Heizung', true, NULL, 0
WHERE NOT EXISTS (SELECT 1 FROM public.trade_categories t WHERE t.name = 'Heizung' AND t.organization_id IS NULL);

INSERT INTO public.trade_categories (name, is_active, organization_id, sort_order)
SELECT 'Trockenbau', true, NULL, 0
WHERE NOT EXISTS (SELECT 1 FROM public.trade_categories t WHERE t.name = 'Trockenbau' AND t.organization_id IS NULL);

INSERT INTO public.trade_categories (name, is_active, organization_id, sort_order)
SELECT 'Maler & Lackierer', true, NULL, 0
WHERE NOT EXISTS (SELECT 1 FROM public.trade_categories t WHERE t.name = 'Maler & Lackierer' AND t.organization_id IS NULL);

INSERT INTO public.trade_categories (name, is_active, organization_id, sort_order)
SELECT 'Fliesen', true, NULL, 0
WHERE NOT EXISTS (SELECT 1 FROM public.trade_categories t WHERE t.name = 'Fliesen' AND t.organization_id IS NULL);

INSERT INTO public.trade_categories (name, is_active, organization_id, sort_order)
SELECT 'Allgemein / Sonstiges', true, NULL, 0
WHERE NOT EXISTS (SELECT 1 FROM public.trade_categories t WHERE t.name = 'Allgemein / Sonstiges' AND t.organization_id IS NULL);

-- Hilfs-CTE: globale Kategorie-IDs
-- Elektro-Positionen … (Spalte active, nicht is_active — siehe position_library)
INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Unterputzdose setzen', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Elektro' AND organization_id IS NULL LIMIT 1), 0.5, 'Stk', '{"stunden":0.5,"menge":0.5,"einheit":"Stk","stundensatz":65}'::jsonb, ARRAY['installation','elektro']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Unterputzdose setzen' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Aufputzdose setzen', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Elektro' AND organization_id IS NULL LIMIT 1), 0.3, 'Stk', '{"stunden":0.3,"menge":0.3,"einheit":"Stk","stundensatz":65}'::jsonb, ARRAY['installation','elektro']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Aufputzdose setzen' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Kabelverlegung UP (je Meter)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Elektro' AND organization_id IS NULL LIMIT 1), 0.15, 'm', '{"stunden":0.15,"menge":1,"einheit":"m","stundensatz":65}'::jsonb, ARRAY['kabel','elektro']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Kabelverlegung UP (je Meter)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Lichtschalter montieren', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Elektro' AND organization_id IS NULL LIMIT 1), 0.4, 'Stk', '{"stunden":0.4,"menge":0.4,"einheit":"Stk","stundensatz":65}'::jsonb, ARRAY['schalter','elektro']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Lichtschalter montieren' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Steckdose montieren', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Elektro' AND organization_id IS NULL LIMIT 1), 0.4, 'Stk', '{"stunden":0.4,"menge":0.4,"einheit":"Stk","stundensatz":65}'::jsonb, ARRAY['steckdose','elektro']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Steckdose montieren' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Leuchte montieren (einfach)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Elektro' AND organization_id IS NULL LIMIT 1), 0.5, 'Stk', '{"stunden":0.5,"menge":0.5,"einheit":"Stk","stundensatz":65}'::jsonb, ARRAY['leuchte','licht']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Leuchte montieren (einfach)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Leuchte montieren (Einbau/komplex)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Elektro' AND organization_id IS NULL LIMIT 1), 1.0, 'Stk', '{"stunden":1.0,"menge":1.0,"einheit":"Stk","stundensatz":65}'::jsonb, ARRAY['leuchte','einbau']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Leuchte montieren (Einbau/komplex)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Unterverteilung verdrahten (je Sicherung)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Elektro' AND organization_id IS NULL LIMIT 1), 0.5, 'Stk', '{"stunden":0.5,"menge":0.5,"einheit":"Stk","stundensatz":65}'::jsonb, ARRAY['verteilung','elektro']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Unterverteilung verdrahten (je Sicherung)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Unterverteilung komplett (bis 12 Kreise)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Elektro' AND organization_id IS NULL LIMIT 1), 8.0, 'Std', '{"stunden":8.0,"menge":8.0,"einheit":"Std","stundensatz":65}'::jsonb, ARRAY['verteilung','komplett']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Unterverteilung komplett (bis 12 Kreise)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Außenleuchte mit Bewegungsmelder', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Elektro' AND organization_id IS NULL LIMIT 1), 1.5, 'Stk', '{"stunden":1.5,"menge":1.5,"einheit":"Stk","stundensatz":65}'::jsonb, ARRAY['außen','bewegungsmelder']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Außenleuchte mit Bewegungsmelder' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'E-Check / Prüfprotokoll', 'pauschal', (SELECT id FROM public.trade_categories WHERE name='Elektro' AND organization_id IS NULL LIMIT 1), 4.0, 'Std', '{"beschreibung":"E-Check und Prüfprotokoll","betrag":0}'::jsonb, ARRAY['prüfung','protokoll']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='E-Check / Prüfprotokoll' AND organization_id IS NULL);

-- Sanitär
INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Waschtisch montieren', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Sanitär' AND organization_id IS NULL LIMIT 1), 2.0, 'Stk', '{"stunden":2.0,"menge":2.0,"einheit":"Stk","stundensatz":65}'::jsonb, ARRAY['waschtisch','bad']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Waschtisch montieren' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'WC-Anlage montieren (Standklosett)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Sanitär' AND organization_id IS NULL LIMIT 1), 2.5, 'Stk', '{"stunden":2.5,"menge":2.5,"einheit":"Stk","stundensatz":65}'::jsonb, ARRAY['wc','bad']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='WC-Anlage montieren (Standklosett)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Wand-WC mit UP-Spülkasten montieren', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Sanitär' AND organization_id IS NULL LIMIT 1), 4.0, 'Stk', '{"stunden":4.0,"menge":4.0,"einheit":"Stk","stundensatz":65}'::jsonb, ARRAY['wc','wand','bad']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Wand-WC mit UP-Spülkasten montieren' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Dusche montieren (komplett)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Sanitär' AND organization_id IS NULL LIMIT 1), 5.0, 'Std', '{"stunden":5.0,"menge":5.0,"einheit":"Std","stundensatz":65}'::jsonb, ARRAY['dusche','bad']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Dusche montieren (komplett)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Armatur montieren', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Sanitär' AND organization_id IS NULL LIMIT 1), 1.0, 'Stk', '{"stunden":1.0,"menge":1.0,"einheit":"Stk","stundensatz":65}'::jsonb, ARRAY['armatur']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Armatur montieren' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Rohrleitung Trinkwasser (je Meter)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Sanitär' AND organization_id IS NULL LIMIT 1), 0.4, 'm', '{"stunden":0.4,"menge":1,"einheit":"m","stundensatz":65}'::jsonb, ARRAY['rohr','wasser']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Rohrleitung Trinkwasser (je Meter)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Badezimmer Komplettsanierung (ca. 5m²)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Sanitär' AND organization_id IS NULL LIMIT 1), 40.0, 'Std', '{"stunden":40.0,"menge":40.0,"einheit":"Std","stundensatz":65}'::jsonb, ARRAY['komplett','sanierung','bad']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Badezimmer Komplettsanierung (ca. 5m²)' AND organization_id IS NULL);

-- Heizung
INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Heizkörper montieren', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Heizung' AND organization_id IS NULL LIMIT 1), 1.5, 'Stk', '{"stunden":1.5,"menge":1.5,"einheit":"Stk","stundensatz":65}'::jsonb, ARRAY['heizkörper','heizung']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Heizkörper montieren' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Thermostatventil tauschen', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Heizung' AND organization_id IS NULL LIMIT 1), 0.5, 'Stk', '{"stunden":0.5,"menge":0.5,"einheit":"Stk","stundensatz":65}'::jsonb, ARRAY['ventil','thermostat']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Thermostatventil tauschen' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Heizungsrohr verlegen (je Meter)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Heizung' AND organization_id IS NULL LIMIT 1), 0.35, 'm', '{"stunden":0.35,"menge":1,"einheit":"m","stundensatz":65}'::jsonb, ARRAY['rohr','heizung']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Heizungsrohr verlegen (je Meter)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Gasheizung Jahresservice', 'pauschal', (SELECT id FROM public.trade_categories WHERE name='Heizung' AND organization_id IS NULL LIMIT 1), 2.0, 'Std', '{"beschreibung":"Gasheizung Jahresservice und Wartung","betrag":0}'::jsonb, ARRAY['wartung','gas','service']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Gasheizung Jahresservice' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Fußbodenheizung verlegen (je m²)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Heizung' AND organization_id IS NULL LIMIT 1), 0.6, 'm²', '{"stunden":0.6,"menge":1,"einheit":"m²","stundensatz":65}'::jsonb, ARRAY['fbh','boden','heizung']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Fußbodenheizung verlegen (je m²)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Umwälzpumpe tauschen', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Heizung' AND organization_id IS NULL LIMIT 1), 1.5, 'Stk', '{"stunden":1.5,"menge":1.5,"einheit":"Stk","stundensatz":65}'::jsonb, ARRAY['pumpe','heizung']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Umwälzpumpe tauschen' AND organization_id IS NULL);

-- Trockenbau
INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Gipskartonwand stellen (je m²)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Trockenbau' AND organization_id IS NULL LIMIT 1), 0.6, 'm²', '{"stunden":0.6,"menge":1,"einheit":"m²","stundensatz":55}'::jsonb, ARRAY['wand','gk','trockenbau']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Gipskartonwand stellen (je m²)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Unterdecke montieren (je m²)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Trockenbau' AND organization_id IS NULL LIMIT 1), 0.7, 'm²', '{"stunden":0.7,"menge":1,"einheit":"m²","stundensatz":55}'::jsonb, ARRAY['decke','gk','trockenbau']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Unterdecke montieren (je m²)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Spachteln & Schleifen (je m²)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Trockenbau' AND organization_id IS NULL LIMIT 1), 0.4, 'm²', '{"stunden":0.4,"menge":1,"einheit":"m²","stundensatz":55}'::jsonb, ARRAY['spachteln','schleifen']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Spachteln & Schleifen (je m²)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Dämmung einlegen (je m²)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Trockenbau' AND organization_id IS NULL LIMIT 1), 0.2, 'm²', '{"stunden":0.2,"menge":1,"einheit":"m²","stundensatz":55}'::jsonb, ARRAY['dämmung','trockenbau']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Dämmung einlegen (je m²)' AND organization_id IS NULL);

-- Maler
INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Wände streichen 2x Anstrich (je m²)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Maler & Lackierer' AND organization_id IS NULL LIMIT 1), 0.15, 'm²', '{"stunden":0.15,"menge":1,"einheit":"m²","stundensatz":50}'::jsonb, ARRAY['streichen','wand','maler']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Wände streichen 2x Anstrich (je m²)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Decke streichen 2x Anstrich (je m²)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Maler & Lackierer' AND organization_id IS NULL LIMIT 1), 0.2, 'm²', '{"stunden":0.2,"menge":1,"einheit":"m²","stundensatz":50}'::jsonb, ARRAY['streichen','decke','maler']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Decke streichen 2x Anstrich (je m²)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Tapezieren (je m²)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Maler & Lackierer' AND organization_id IS NULL LIMIT 1), 0.25, 'm²', '{"stunden":0.25,"menge":1,"einheit":"m²","stundensatz":50}'::jsonb, ARRAY['tapete','maler']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Tapezieren (je m²)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Türen & Fenster lackieren (je Stück)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Maler & Lackierer' AND organization_id IS NULL LIMIT 1), 2.5, 'Stk', '{"stunden":2.5,"menge":2.5,"einheit":"Stk","stundensatz":50}'::jsonb, ARRAY['lackieren','tür','fenster']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Türen & Fenster lackieren (je Stück)' AND organization_id IS NULL);

-- Fliesen
INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Fliesen verlegen Boden (je m²)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Fliesen' AND organization_id IS NULL LIMIT 1), 0.8, 'm²', '{"stunden":0.8,"menge":1,"einheit":"m²","stundensatz":60}'::jsonb, ARRAY['boden','fliesen']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Fliesen verlegen Boden (je m²)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Fliesen verlegen Wand (je m²)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Fliesen' AND organization_id IS NULL LIMIT 1), 1.0, 'm²', '{"stunden":1.0,"menge":1,"einheit":"m²","stundensatz":60}'::jsonb, ARRAY['wand','fliesen']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Fliesen verlegen Wand (je m²)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Verfugen (je m²)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Fliesen' AND organization_id IS NULL LIMIT 1), 0.3, 'm²', '{"stunden":0.3,"menge":1,"einheit":"m²","stundensatz":60}'::jsonb, ARRAY['fugen','fliesen']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Verfugen (je m²)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Altbelag entfernen (je m²)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Fliesen' AND organization_id IS NULL LIMIT 1), 0.4, 'm²', '{"stunden":0.4,"menge":1,"einheit":"m²","stundensatz":60}'::jsonb, ARRAY['demontage','altbelag']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Altbelag entfernen (je m²)' AND organization_id IS NULL);

-- Allgemein
INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Anfahrt / Rüstzeit (Pauschale)', 'pauschal', (SELECT id FROM public.trade_categories WHERE name='Allgemein / Sonstiges' AND organization_id IS NULL LIMIT 1), NULL, 'Std', '{"beschreibung":"Anfahrt und Rüstzeit","betrag":0}'::jsonb, ARRAY['anfahrt','rüstzeit']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Anfahrt / Rüstzeit (Pauschale)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Materialentsorgung (Pauschale)', 'pauschal', (SELECT id FROM public.trade_categories WHERE name='Allgemein / Sonstiges' AND organization_id IS NULL LIMIT 1), NULL, 'Std', '{"beschreibung":"Entsorgung von Altmaterial","betrag":0}'::jsonb, ARRAY['entsorgung','material']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Materialentsorgung (Pauschale)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Aufmaß & Dokumentation', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Allgemein / Sonstiges' AND organization_id IS NULL LIMIT 1), 1.5, 'Std', '{"stunden":1.5,"menge":1.5,"einheit":"Std","stundensatz":65}'::jsonb, ARRAY['dokumentation','aufmaß']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Aufmaß & Dokumentation' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Projektleitung / Bauleitung (je Stunde)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Allgemein / Sonstiges' AND organization_id IS NULL LIMIT 1), 1.0, 'Std', '{"stunden":1.0,"menge":1.0,"einheit":"Std","stundensatz":75}'::jsonb, ARRAY['bauleitung','projektleitung']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Projektleitung / Bauleitung (je Stunde)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Baureinigung (je m²)', 'arbeit', (SELECT id FROM public.trade_categories WHERE name='Allgemein / Sonstiges' AND organization_id IS NULL LIMIT 1), 0.1, 'm²', '{"stunden":0.1,"menge":1,"einheit":"m²","stundensatz":40}'::jsonb, ARRAY['reinigung','bau']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Baureinigung (je m²)' AND organization_id IS NULL);

INSERT INTO public.position_library (name, position_type, trade_category_id, default_hours, default_unit, default_details, tags, usage_count, organization_id, active)
SELECT 'Gerüst mieten / stellen (Fremdleistung)', 'fremdleistung', (SELECT id FROM public.trade_categories WHERE name='Allgemein / Sonstiges' AND organization_id IS NULL LIMIT 1), NULL, 'Std', '{"leistungsbeschreibung":"Gerüst stellen und mieten","betrag":0,"aufschlag_pct":10}'::jsonb, ARRAY['gerüst','fremdleistung']::text[], 0, NULL, true WHERE NOT EXISTS (SELECT 1 FROM public.position_library WHERE name='Gerüst mieten / stellen (Fremdleistung)' AND organization_id IS NULL);
