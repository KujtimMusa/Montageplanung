CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid AS $$
  SELECT organization_id
  FROM public.employees
  WHERE auth_user_id = auth.uid()
    AND active = true
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_org_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees
    WHERE auth_user_id = auth.uid()
      AND role IN ('admin','abteilungsleiter','teamleiter')
      AND active = true
      AND organization_id = public.get_my_org_id()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;
