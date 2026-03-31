DROP POLICY IF EXISTS "employees_select" ON public.employees;
DROP POLICY IF EXISTS "employees_insert" ON public.employees;
DROP POLICY IF EXISTS "employees_update" ON public.employees;
DROP POLICY IF EXISTS "employees_delete" ON public.employees;

CREATE POLICY "employees_select" ON public.employees
  FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "employees_insert" ON public.employees
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_my_org_id()
    AND public.is_org_admin()
  );

CREATE POLICY "employees_update" ON public.employees
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND (
      auth_user_id = auth.uid()
      OR public.is_org_admin()
    )
  )
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "employees_delete" ON public.employees
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.is_org_admin()
  );

DROP POLICY IF EXISTS "assignments_select" ON public.assignments;
DROP POLICY IF EXISTS "assignments_insert" ON public.assignments;
DROP POLICY IF EXISTS "assignments_update" ON public.assignments;
DROP POLICY IF EXISTS "assignments_delete" ON public.assignments;

CREATE POLICY "assignments_select" ON public.assignments
  FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "assignments_insert" ON public.assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_my_org_id()
    AND public.is_org_admin()
  );

CREATE POLICY "assignments_update" ON public.assignments
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.is_org_admin()
  );

CREATE POLICY "assignments_delete" ON public.assignments
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.is_org_admin()
  );

DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;

CREATE POLICY "projects_select" ON public.projects
  FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_my_org_id()
    AND public.is_org_admin()
  );

CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.is_org_admin()
  );

DROP POLICY IF EXISTS "absences_select" ON public.absences;
DROP POLICY IF EXISTS "absences_insert" ON public.absences;
DROP POLICY IF EXISTS "absences_update" ON public.absences;
DROP POLICY IF EXISTS "absences_delete" ON public.absences;

CREATE POLICY "absences_select" ON public.absences
  FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "absences_insert" ON public.absences
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "absences_update" ON public.absences
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.is_org_admin()
  );

CREATE POLICY "absences_delete" ON public.absences
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.is_org_admin()
  );

DROP POLICY IF EXISTS "subcontractors_select" ON public.subcontractors;
DROP POLICY IF EXISTS "subcontractors_insert" ON public.subcontractors;
DROP POLICY IF EXISTS "subcontractors_update" ON public.subcontractors;
DROP POLICY IF EXISTS "subcontractors_delete" ON public.subcontractors;

CREATE POLICY "subcontractors_select" ON public.subcontractors
  FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "subcontractors_insert" ON public.subcontractors
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_my_org_id()
    AND public.is_org_admin()
  );

CREATE POLICY "subcontractors_update" ON public.subcontractors
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "subcontractors_delete" ON public.subcontractors
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.is_org_admin()
  );

DROP POLICY IF EXISTS "settings_select" ON public.settings;
DROP POLICY IF EXISTS "settings_update" ON public.settings;

CREATE POLICY "settings_select" ON public.settings
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.is_org_admin()
  );

CREATE POLICY "settings_update" ON public.settings
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.is_org_admin()
  );

DROP POLICY IF EXISTS "organizations_select" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update" ON public.organizations;

CREATE POLICY "organizations_select" ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.get_my_org_id());

CREATE POLICY "organizations_update" ON public.organizations
  FOR UPDATE TO authenticated
  USING (
    id = public.get_my_org_id()
    AND public.is_org_admin()
  );

DROP POLICY IF EXISTS "invitations_select" ON public.invitations;
DROP POLICY IF EXISTS "invitations_insert" ON public.invitations;

CREATE POLICY "invitations_select" ON public.invitations
  FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "invitations_insert" ON public.invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_my_org_id()
    AND public.is_org_admin()
  );
