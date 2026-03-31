-- Tenant-Isolation für Kunden/Teams/Abteilungen + Join-Tabellen

-- customers: organization_id nachziehen
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Bestandsdaten aus Projekten ableiten, falls möglich
UPDATE public.customers c
SET organization_id = p.organization_id
FROM (
  SELECT customer_id, MIN(organization_id::text)::uuid AS organization_id
  FROM public.projects
  WHERE customer_id IS NOT NULL
  GROUP BY customer_id
) p
WHERE c.id = p.customer_id
  AND c.organization_id IS NULL;

-- Fallback für historische Daten
UPDATE public.customers
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

ALTER TABLE public.customers
  ALTER COLUMN organization_id SET DEFAULT public.get_my_org_id(),
  ALTER COLUMN organization_id SET NOT NULL;

-- teams/departments: standardmäßig aktuelle Org setzen
UPDATE public.teams
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE public.departments
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

ALTER TABLE public.teams
  ALTER COLUMN organization_id SET DEFAULT public.get_my_org_id(),
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.departments
  ALTER COLUMN organization_id SET DEFAULT public.get_my_org_id(),
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_org ON public.customers (organization_id);
CREATE INDEX IF NOT EXISTS idx_departments_org ON public.departments (organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_org ON public.teams (organization_id);

-- customers policies
DROP POLICY IF EXISTS "customers_select_auth" ON public.customers;
DROP POLICY IF EXISTS "customers_insert_auth" ON public.customers;
DROP POLICY IF EXISTS "customers_update_auth" ON public.customers;
DROP POLICY IF EXISTS "customers_delete_auth" ON public.customers;
DROP POLICY IF EXISTS "customers_select" ON public.customers;
DROP POLICY IF EXISTS "customers_insert" ON public.customers;
DROP POLICY IF EXISTS "customers_update" ON public.customers;
DROP POLICY IF EXISTS "customers_delete" ON public.customers;

CREATE POLICY "customers_select"
  ON public.customers FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "customers_insert"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_my_org_id()
    AND public.is_org_admin()
  );

CREATE POLICY "customers_update"
  ON public.customers FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.is_org_admin()
  )
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "customers_delete"
  ON public.customers FOR DELETE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.is_org_admin()
  );

-- departments policies
DROP POLICY IF EXISTS "departments_select_auth" ON public.departments;
DROP POLICY IF EXISTS "departments_insert_auth" ON public.departments;
DROP POLICY IF EXISTS "departments_update_auth" ON public.departments;
DROP POLICY IF EXISTS "departments_delete_auth" ON public.departments;
DROP POLICY IF EXISTS "departments_select" ON public.departments;
DROP POLICY IF EXISTS "departments_insert" ON public.departments;
DROP POLICY IF EXISTS "departments_update" ON public.departments;
DROP POLICY IF EXISTS "departments_delete" ON public.departments;

CREATE POLICY "departments_select"
  ON public.departments FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "departments_insert"
  ON public.departments FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_my_org_id()
    AND public.is_org_admin()
  );

CREATE POLICY "departments_update"
  ON public.departments FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.is_org_admin()
  )
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "departments_delete"
  ON public.departments FOR DELETE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.is_org_admin()
  );

-- teams policies
DROP POLICY IF EXISTS "teams_select" ON public.teams;
DROP POLICY IF EXISTS "teams_insert" ON public.teams;
DROP POLICY IF EXISTS "teams_update" ON public.teams;
DROP POLICY IF EXISTS "teams_delete" ON public.teams;
DROP POLICY IF EXISTS "teams_select_auth" ON public.teams;
DROP POLICY IF EXISTS "teams_insert_auth" ON public.teams;
DROP POLICY IF EXISTS "teams_update_auth" ON public.teams;
DROP POLICY IF EXISTS "teams_delete_auth" ON public.teams;

CREATE POLICY "teams_select"
  ON public.teams FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "teams_insert"
  ON public.teams FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_my_org_id()
    AND public.is_org_admin()
  );

CREATE POLICY "teams_update"
  ON public.teams FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.is_org_admin()
  )
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "teams_delete"
  ON public.teams FOR DELETE TO authenticated
  USING (
    organization_id = public.get_my_org_id()
    AND public.is_org_admin()
  );

-- team_members policies (über Join auf teams + employees isolieren)
DROP POLICY IF EXISTS "team_members_select" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert" ON public.team_members;
DROP POLICY IF EXISTS "team_members_update" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete" ON public.team_members;
DROP POLICY IF EXISTS "team_members_select_auth" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert_auth" ON public.team_members;
DROP POLICY IF EXISTS "team_members_update_auth" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete_auth" ON public.team_members;

CREATE POLICY "team_members_select"
  ON public.team_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = team_members.team_id
        AND t.organization_id = public.get_my_org_id()
    )
  );

CREATE POLICY "team_members_insert"
  ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_admin()
    AND EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = team_members.team_id
        AND t.organization_id = public.get_my_org_id()
    )
    AND EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = team_members.employee_id
        AND e.organization_id = public.get_my_org_id()
    )
  );

CREATE POLICY "team_members_update"
  ON public.team_members FOR UPDATE TO authenticated
  USING (
    public.is_org_admin()
    AND EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = team_members.team_id
        AND t.organization_id = public.get_my_org_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = team_members.team_id
        AND t.organization_id = public.get_my_org_id()
    )
    AND EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = team_members.employee_id
        AND e.organization_id = public.get_my_org_id()
    )
  );

CREATE POLICY "team_members_delete"
  ON public.team_members FOR DELETE TO authenticated
  USING (
    public.is_org_admin()
    AND EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = team_members.team_id
        AND t.organization_id = public.get_my_org_id()
    )
  );

-- employee_departments policies (über Join auf departments + employees isolieren)
DROP POLICY IF EXISTS "employee_departments_select_auth" ON public.employee_departments;
DROP POLICY IF EXISTS "employee_departments_insert_auth" ON public.employee_departments;
DROP POLICY IF EXISTS "employee_departments_update_auth" ON public.employee_departments;
DROP POLICY IF EXISTS "employee_departments_delete_auth" ON public.employee_departments;
DROP POLICY IF EXISTS "employee_departments_select" ON public.employee_departments;
DROP POLICY IF EXISTS "employee_departments_insert" ON public.employee_departments;
DROP POLICY IF EXISTS "employee_departments_update" ON public.employee_departments;
DROP POLICY IF EXISTS "employee_departments_delete" ON public.employee_departments;

CREATE POLICY "employee_departments_select"
  ON public.employee_departments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.departments d
      WHERE d.id = employee_departments.department_id
        AND d.organization_id = public.get_my_org_id()
    )
  );

CREATE POLICY "employee_departments_insert"
  ON public.employee_departments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_admin()
    AND EXISTS (
      SELECT 1
      FROM public.departments d
      WHERE d.id = employee_departments.department_id
        AND d.organization_id = public.get_my_org_id()
    )
    AND EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = employee_departments.employee_id
        AND e.organization_id = public.get_my_org_id()
    )
  );

CREATE POLICY "employee_departments_update"
  ON public.employee_departments FOR UPDATE TO authenticated
  USING (
    public.is_org_admin()
    AND EXISTS (
      SELECT 1
      FROM public.departments d
      WHERE d.id = employee_departments.department_id
        AND d.organization_id = public.get_my_org_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.departments d
      WHERE d.id = employee_departments.department_id
        AND d.organization_id = public.get_my_org_id()
    )
    AND EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = employee_departments.employee_id
        AND e.organization_id = public.get_my_org_id()
    )
  );

CREATE POLICY "employee_departments_delete"
  ON public.employee_departments FOR DELETE TO authenticated
  USING (
    public.is_org_admin()
    AND EXISTS (
      SELECT 1
      FROM public.departments d
      WHERE d.id = employee_departments.department_id
        AND d.organization_id = public.get_my_org_id()
    )
  );
