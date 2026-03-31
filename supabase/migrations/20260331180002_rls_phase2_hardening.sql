-- RLS Phase 2: Resttabellen härten (ohne Leseflows zu brechen)

-- departments
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
  USING (true);

CREATE POLICY "departments_insert"
  ON public.departments FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "departments_update"
  ON public.departments FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "departments_delete"
  ON public.departments FOR DELETE TO authenticated
  USING (public.is_admin());

-- customers
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
  USING (true);

CREATE POLICY "customers_insert"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "customers_update"
  ON public.customers FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "customers_delete"
  ON public.customers FOR DELETE TO authenticated
  USING (public.is_admin());

-- weather_alerts
DROP POLICY IF EXISTS "weather_alerts_select_auth" ON public.weather_alerts;
DROP POLICY IF EXISTS "weather_alerts_insert_auth" ON public.weather_alerts;
DROP POLICY IF EXISTS "weather_alerts_update_auth" ON public.weather_alerts;
DROP POLICY IF EXISTS "weather_alerts_delete_auth" ON public.weather_alerts;
DROP POLICY IF EXISTS "weather_alerts_select" ON public.weather_alerts;
DROP POLICY IF EXISTS "weather_alerts_insert" ON public.weather_alerts;
DROP POLICY IF EXISTS "weather_alerts_update" ON public.weather_alerts;
DROP POLICY IF EXISTS "weather_alerts_delete" ON public.weather_alerts;

CREATE POLICY "weather_alerts_select"
  ON public.weather_alerts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "weather_alerts_insert"
  ON public.weather_alerts FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "weather_alerts_update"
  ON public.weather_alerts FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "weather_alerts_delete"
  ON public.weather_alerts FOR DELETE TO authenticated
  USING (public.is_admin());

-- booking_rules
DROP POLICY IF EXISTS "booking_rules_select_auth" ON public.booking_rules;
DROP POLICY IF EXISTS "booking_rules_insert_auth" ON public.booking_rules;
DROP POLICY IF EXISTS "booking_rules_update_auth" ON public.booking_rules;
DROP POLICY IF EXISTS "booking_rules_delete_auth" ON public.booking_rules;
DROP POLICY IF EXISTS "booking_rules_select" ON public.booking_rules;
DROP POLICY IF EXISTS "booking_rules_insert" ON public.booking_rules;
DROP POLICY IF EXISTS "booking_rules_update" ON public.booking_rules;
DROP POLICY IF EXISTS "booking_rules_delete" ON public.booking_rules;

CREATE POLICY "booking_rules_select"
  ON public.booking_rules FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "booking_rules_insert"
  ON public.booking_rules FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "booking_rules_update"
  ON public.booking_rules FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "booking_rules_delete"
  ON public.booking_rules FOR DELETE TO authenticated
  USING (public.is_admin());

-- subcontractor_bookings
DROP POLICY IF EXISTS "subcontractor_bookings_select_auth" ON public.subcontractor_bookings;
DROP POLICY IF EXISTS "subcontractor_bookings_insert_auth" ON public.subcontractor_bookings;
DROP POLICY IF EXISTS "subcontractor_bookings_update_auth" ON public.subcontractor_bookings;
DROP POLICY IF EXISTS "subcontractor_bookings_delete_auth" ON public.subcontractor_bookings;
DROP POLICY IF EXISTS "subcontractor_bookings_select" ON public.subcontractor_bookings;
DROP POLICY IF EXISTS "subcontractor_bookings_insert" ON public.subcontractor_bookings;
DROP POLICY IF EXISTS "subcontractor_bookings_update" ON public.subcontractor_bookings;
DROP POLICY IF EXISTS "subcontractor_bookings_delete" ON public.subcontractor_bookings;

CREATE POLICY "subcontractor_bookings_select"
  ON public.subcontractor_bookings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "subcontractor_bookings_insert"
  ON public.subcontractor_bookings FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "subcontractor_bookings_update"
  ON public.subcontractor_bookings FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "subcontractor_bookings_delete"
  ON public.subcontractor_bookings FOR DELETE TO authenticated
  USING (public.is_admin());

-- employee_departments
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
  USING (true);

CREATE POLICY "employee_departments_insert"
  ON public.employee_departments FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "employee_departments_update"
  ON public.employee_departments FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "employee_departments_delete"
  ON public.employee_departments FOR DELETE TO authenticated
  USING (public.is_admin());

-- assignment_subcontractors
DROP POLICY IF EXISTS "assignment_subcontractors_select_auth" ON public.assignment_subcontractors;
DROP POLICY IF EXISTS "assignment_subcontractors_insert_auth" ON public.assignment_subcontractors;
DROP POLICY IF EXISTS "assignment_subcontractors_update_auth" ON public.assignment_subcontractors;
DROP POLICY IF EXISTS "assignment_subcontractors_delete_auth" ON public.assignment_subcontractors;
DROP POLICY IF EXISTS "assignment_subcontractors_select" ON public.assignment_subcontractors;
DROP POLICY IF EXISTS "assignment_subcontractors_insert" ON public.assignment_subcontractors;
DROP POLICY IF EXISTS "assignment_subcontractors_update" ON public.assignment_subcontractors;
DROP POLICY IF EXISTS "assignment_subcontractors_delete" ON public.assignment_subcontractors;

CREATE POLICY "assignment_subcontractors_select"
  ON public.assignment_subcontractors FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "assignment_subcontractors_insert"
  ON public.assignment_subcontractors FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "assignment_subcontractors_update"
  ON public.assignment_subcontractors FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "assignment_subcontractors_delete"
  ON public.assignment_subcontractors FOR DELETE TO authenticated
  USING (public.is_admin());

-- notifications: eigene Notifications + Admin
DROP POLICY IF EXISTS "notifications_select_auth" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_auth" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_auth" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;

CREATE POLICY "notifications_select"
  ON public.notifications FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR employee_id IN (
      SELECT id FROM public.employees WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "notifications_insert"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "notifications_update"
  ON public.notifications FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR employee_id IN (
      SELECT id FROM public.employees WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR employee_id IN (
      SELECT id FROM public.employees WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "notifications_delete"
  ON public.notifications FOR DELETE TO authenticated
  USING (public.is_admin());
