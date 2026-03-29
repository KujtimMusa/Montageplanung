-- Kunden löschen (Stammdaten) — analog departments/projects
CREATE POLICY "customers_delete_auth"
  ON public.customers FOR DELETE TO authenticated
  USING (true);
