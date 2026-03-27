-- Teamleiter sollen Stammdaten auf der Teams-Seite pflegen (Monteure, wie darfTeamsVerwaltung).

DROP POLICY IF EXISTS "employees_update_leitung" ON public.employees;
CREATE POLICY "employees_update_leitung"
  ON public.employees FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND e.role IN ('admin', 'abteilungsleiter', 'teamleiter')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND e.role IN ('admin', 'abteilungsleiter', 'teamleiter')
    )
  );

DROP POLICY IF EXISTS "employees_insert_leitung" ON public.employees;
CREATE POLICY "employees_insert_leitung"
  ON public.employees FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND e.role IN ('admin', 'abteilungsleiter', 'teamleiter')
    )
  );

DROP POLICY IF EXISTS "employees_delete_leitung" ON public.employees;
CREATE POLICY "employees_delete_leitung"
  ON public.employees FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND e.role IN ('admin', 'abteilungsleiter', 'teamleiter')
    )
  );
