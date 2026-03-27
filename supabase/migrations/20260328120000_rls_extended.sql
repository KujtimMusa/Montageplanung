-- Erweiterte RLS: Abteilungen/Projekte löschen, Abwesenheiten, Wetter, Dienstleister, Benachrichtigungen
-- Multi-Tenant: alle authentifizierten Nutzer dürfen Stammdaten pflegen (kein gegenseitiges Blockieren).

-- Abteilungen: Schreibzugriff
CREATE POLICY "departments_insert_auth"
  ON public.departments FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "departments_update_auth"
  ON public.departments FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "departments_delete_auth"
  ON public.departments FOR DELETE TO authenticated
  USING (true);

-- Projekte löschen
CREATE POLICY "projects_delete_auth"
  ON public.projects FOR DELETE TO authenticated
  USING (true);

-- Abwesenheiten
ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "absences_select_auth"
  ON public.absences FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "absences_insert_auth"
  ON public.absences FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "absences_update_auth"
  ON public.absences FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "absences_delete_auth"
  ON public.absences FOR DELETE TO authenticated
  USING (true);

-- Wetterwarnungen
ALTER TABLE public.weather_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weather_alerts_select_auth"
  ON public.weather_alerts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "weather_alerts_insert_auth"
  ON public.weather_alerts FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "weather_alerts_update_auth"
  ON public.weather_alerts FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "weather_alerts_delete_auth"
  ON public.weather_alerts FOR DELETE TO authenticated
  USING (true);

-- Dienstleister
ALTER TABLE public.subcontractors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subcontractors_select_auth"
  ON public.subcontractors FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "subcontractors_insert_auth"
  ON public.subcontractors FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "subcontractors_update_auth"
  ON public.subcontractors FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "subcontractors_delete_auth"
  ON public.subcontractors FOR DELETE TO authenticated
  USING (true);

ALTER TABLE public.booking_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_rules_select_auth"
  ON public.booking_rules FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "booking_rules_insert_auth"
  ON public.booking_rules FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "booking_rules_update_auth"
  ON public.booking_rules FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "booking_rules_delete_auth"
  ON public.booking_rules FOR DELETE TO authenticated
  USING (true);

ALTER TABLE public.subcontractor_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subcontractor_bookings_select_auth"
  ON public.subcontractor_bookings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "subcontractor_bookings_insert_auth"
  ON public.subcontractor_bookings FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "subcontractor_bookings_update_auth"
  ON public.subcontractor_bookings FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "subcontractor_bookings_delete_auth"
  ON public.subcontractor_bookings FOR DELETE TO authenticated
  USING (true);

-- Benachrichtigungen (Übersicht im Team)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_auth"
  ON public.notifications FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "notifications_insert_auth"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "notifications_update_auth"
  ON public.notifications FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
