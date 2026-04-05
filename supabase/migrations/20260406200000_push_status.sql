ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS push_status text
    DEFAULT 'unknown'
    CHECK (push_status IN ('unknown', 'granted', 'denied', 'unsupported'));

COMMENT ON COLUMN public.employees.push_status IS
  'unknown = nie gefragt, granted = aktiv, denied = verweigert, unsupported = Browser unterstützt kein Push';

NOTIFY pgrst, 'reload schema';
