-- RLS-Hardening: Rollenbasierte Policies statt global USING(true)

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees
    WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'abteilungsleiter', 'teamleiter')
      AND active = true
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.same_org(target_auth_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e1
    JOIN public.employees e2 ON e2.auth_user_id = target_auth_id
    WHERE e1.auth_user_id = auth.uid()
      AND e1.active = true
      AND e2.active = true
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- employees
DROP POLICY IF EXISTS "employees_select" ON public.employees;
DROP POLICY IF EXISTS "employees_insert" ON public.employees;
DROP POLICY IF EXISTS "employees_update" ON public.employees;
DROP POLICY IF EXISTS "employees_delete" ON public.employees;
DROP POLICY IF EXISTS "employees_select_auth" ON public.employees;
DROP POLICY IF EXISTS "employees_update_leitung" ON public.employees;
DROP POLICY IF EXISTS "employees_insert_leitung" ON public.employees;
DROP POLICY IF EXISTS "employees_delete_leitung" ON public.employees;

CREATE POLICY "employees_select"
  ON public.employees FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "employees_insert"
  ON public.employees FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "employees_update"
  ON public.employees FOR UPDATE TO authenticated
  USING (auth.uid() = auth_user_id OR public.is_admin())
  WITH CHECK (auth.uid() = auth_user_id OR public.is_admin());

CREATE POLICY "employees_delete"
  ON public.employees FOR DELETE TO authenticated
  USING (public.is_admin());

-- assignments
DROP POLICY IF EXISTS "assignments_select" ON public.assignments;
DROP POLICY IF EXISTS "assignments_insert" ON public.assignments;
DROP POLICY IF EXISTS "assignments_update" ON public.assignments;
DROP POLICY IF EXISTS "assignments_delete" ON public.assignments;
DROP POLICY IF EXISTS "assignments_select_auth" ON public.assignments;
DROP POLICY IF EXISTS "assignments_insert_auth" ON public.assignments;
DROP POLICY IF EXISTS "assignments_update_auth" ON public.assignments;
DROP POLICY IF EXISTS "assignments_delete_auth" ON public.assignments;

CREATE POLICY "assignments_select"
  ON public.assignments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "assignments_insert"
  ON public.assignments FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "assignments_update"
  ON public.assignments FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "assignments_delete"
  ON public.assignments FOR DELETE TO authenticated
  USING (public.is_admin());

-- projects
DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;
DROP POLICY IF EXISTS "projects_select_auth" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_auth" ON public.projects;
DROP POLICY IF EXISTS "projects_update_auth" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_auth" ON public.projects;

CREATE POLICY "projects_select"
  ON public.projects FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "projects_insert"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "projects_update"
  ON public.projects FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "projects_delete"
  ON public.projects FOR DELETE TO authenticated
  USING (public.is_admin());

-- absences
DROP POLICY IF EXISTS "absences_select" ON public.absences;
DROP POLICY IF EXISTS "absences_insert" ON public.absences;
DROP POLICY IF EXISTS "absences_update" ON public.absences;
DROP POLICY IF EXISTS "absences_delete" ON public.absences;
DROP POLICY IF EXISTS "absences_select_auth" ON public.absences;
DROP POLICY IF EXISTS "absences_insert_auth" ON public.absences;
DROP POLICY IF EXISTS "absences_update_auth" ON public.absences;
DROP POLICY IF EXISTS "absences_delete_auth" ON public.absences;

CREATE POLICY "absences_select"
  ON public.absences FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR employee_id IN (
      SELECT id FROM public.employees WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "absences_insert"
  ON public.absences FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR employee_id IN (
      SELECT id FROM public.employees WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "absences_update"
  ON public.absences FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "absences_delete"
  ON public.absences FOR DELETE TO authenticated
  USING (public.is_admin());

-- settings
DROP POLICY IF EXISTS "settings_select" ON public.settings;
DROP POLICY IF EXISTS "settings_insert" ON public.settings;
DROP POLICY IF EXISTS "settings_update" ON public.settings;
DROP POLICY IF EXISTS "settings_delete" ON public.settings;
DROP POLICY IF EXISTS "settings_select_auth" ON public.settings;
DROP POLICY IF EXISTS "settings_insert_auth" ON public.settings;
DROP POLICY IF EXISTS "settings_update_auth" ON public.settings;
DROP POLICY IF EXISTS "settings_delete_auth" ON public.settings;

CREATE POLICY "settings_select"
  ON public.settings FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "settings_insert"
  ON public.settings FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "settings_update"
  ON public.settings FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "settings_delete"
  ON public.settings FOR DELETE TO authenticated
  USING (public.is_admin());

-- subcontractors
DROP POLICY IF EXISTS "subcontractors_select" ON public.subcontractors;
DROP POLICY IF EXISTS "subcontractors_insert" ON public.subcontractors;
DROP POLICY IF EXISTS "subcontractors_update" ON public.subcontractors;
DROP POLICY IF EXISTS "subcontractors_delete" ON public.subcontractors;
DROP POLICY IF EXISTS "subcontractors_select_auth" ON public.subcontractors;
DROP POLICY IF EXISTS "subcontractors_insert_auth" ON public.subcontractors;
DROP POLICY IF EXISTS "subcontractors_update_auth" ON public.subcontractors;
DROP POLICY IF EXISTS "subcontractors_delete_auth" ON public.subcontractors;

CREATE POLICY "subcontractors_select"
  ON public.subcontractors FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "subcontractors_insert"
  ON public.subcontractors FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "subcontractors_update"
  ON public.subcontractors FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "subcontractors_delete"
  ON public.subcontractors FOR DELETE TO authenticated
  USING (public.is_admin());

-- agent_log
DROP POLICY IF EXISTS "agent_log_select" ON public.agent_log;
DROP POLICY IF EXISTS "agent_log_insert" ON public.agent_log;
DROP POLICY IF EXISTS "agent_log_select_auth" ON public.agent_log;
DROP POLICY IF EXISTS "agent_log_insert_auth" ON public.agent_log;

CREATE POLICY "agent_log_select"
  ON public.agent_log FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "agent_log_insert"
  ON public.agent_log FOR INSERT TO authenticated
  WITH CHECK (true);
