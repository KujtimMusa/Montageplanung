-- Pivot: Assignment ↔ Dienstleister (subcontractors) für externe Anfragen

CREATE TABLE IF NOT EXISTS public.assignment_subcontractors (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id       UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  subcontractor_id    UUID NOT NULL REFERENCES public.subcontractors(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'angefragt'
                        CHECK (status IN ('angefragt','bestaetigt','abgelehnt')),
  email_gesendet_at   TIMESTAMPTZ,
  bestaetigt_at       TIMESTAMPTZ,
  notiz               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assignment_id, subcontractor_id)
);

ALTER TABLE public.assignment_subcontractors ENABLE ROW LEVEL SECURITY;

-- Demo-/Multi-Tenant: wie bei anderen Stammdatentabellen (authenticated darf alles)
CREATE POLICY "assignment_subcontractors_select_auth"
  ON public.assignment_subcontractors FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "assignment_subcontractors_insert_auth"
  ON public.assignment_subcontractors FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "assignment_subcontractors_update_auth"
  ON public.assignment_subcontractors FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "assignment_subcontractors_delete_auth"
  ON public.assignment_subcontractors FOR DELETE TO authenticated
  USING (true);

-- Index für schnelle Listen
CREATE INDEX IF NOT EXISTS idx_assignment_subcontractors_subcontractor_id
  ON public.assignment_subcontractors(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_assignment_subcontractors_assignment_id
  ON public.assignment_subcontractors(assignment_id);

