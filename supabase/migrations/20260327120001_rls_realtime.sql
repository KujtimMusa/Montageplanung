-- Row Level Security + Realtime für Kern-Tabellen
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Lesen: alle angemeldeten Nutzer (Kalender & Listen)
CREATE POLICY "departments_select_auth"
  ON public.departments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "employees_select_auth"
  ON public.employees FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "customers_select_auth"
  ON public.customers FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "projects_select_auth"
  ON public.projects FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "assignments_select_auth"
  ON public.assignments FOR SELECT TO authenticated
  USING (true);

-- Schreiben Projekte & Einsätze
CREATE POLICY "projects_insert_auth"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "projects_update_auth"
  ON public.projects FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "assignments_insert_auth"
  ON public.assignments FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "assignments_update_auth"
  ON public.assignments FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "assignments_delete_auth"
  ON public.assignments FOR DELETE TO authenticated
  USING (true);

-- Mitarbeiter: nur Admin / Abteilungsleiter dürfen Rollen & Status ändern
CREATE POLICY "employees_update_leitung"
  ON public.employees FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND e.role IN ('admin', 'abteilungsleiter')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND e.role IN ('admin', 'abteilungsleiter')
    )
  );

-- Kunden anlegen (Phase 1 Stammdaten)
CREATE POLICY "customers_insert_auth"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "customers_update_auth"
  ON public.customers FOR UPDATE TO authenticated
  USING (true);

-- Realtime: vollständige Zeilen bei UPDATE/DELETE
ALTER TABLE public.assignments REPLICA IDENTITY FULL;

-- Realtime: Änderungen an Einsätzen live
ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments;
