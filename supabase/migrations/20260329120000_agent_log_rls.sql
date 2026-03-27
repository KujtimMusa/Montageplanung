-- Agent-Log für Lern-/Auswertungs-API lesbar und beschreibbar
ALTER TABLE public.agent_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_log_select_auth"
  ON public.agent_log FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "agent_log_insert_auth"
  ON public.agent_log FOR INSERT TO authenticated
  WITH CHECK (true);
