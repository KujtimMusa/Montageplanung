-- In-App: optionale Zuordnung zur Organisation + Index
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_employee_created
  ON public.notifications (employee_id, read, created_at DESC);

COMMENT ON COLUMN public.notifications.organization_id IS 'Optional: Tenant für spätere Filter/Analytics';

-- Web Push Subscriptions (Monteur-PWA)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees (id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_employee
  ON public.push_subscriptions (employee_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Nur authentifizierte Koordinatoren (gleiche Org) — PWA schreibt per Service-Role-API
CREATE POLICY "push_subscriptions_select"
  ON public.push_subscriptions FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());

CREATE POLICY "push_subscriptions_insert"
  ON public.push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "push_subscriptions_update"
  ON public.push_subscriptions FOR UPDATE TO authenticated
  USING (organization_id = public.get_my_org_id())
  WITH CHECK (organization_id = public.get_my_org_id());

CREATE POLICY "push_subscriptions_delete"
  ON public.push_subscriptions FOR DELETE TO authenticated
  USING (organization_id = public.get_my_org_id());
