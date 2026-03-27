-- Finale Auth-Trigger-Regel: Auth-User (Koordinatoren) werden als admin angelegt.
-- Ersetzt die früheren Migrationen auth_employee_trigger.sql und auth_default_role_teamleiter.sql.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.employees (
    auth_user_id, name, email, role, active, created_at
  )
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
      SPLIT_PART(NEW.email, '@', 1)
    ),
    NEW.email,
    'admin',
    true,
    NOW()
  )
  ON CONFLICT (auth_user_id)
  DO UPDATE SET
    role = 'admin',
    active = true;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

UPDATE public.employees
SET role = 'admin'
WHERE auth_user_id IS NOT NULL
  AND role IN ('monteur', 'teamleiter');

ALTER TABLE public.employees ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.employees ALTER COLUMN auth_user_id DROP NOT NULL;

-- Monteur-Stammdaten (UI: Qualifikationen, primäres Team)
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS qualifikationen text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams (id) ON DELETE SET NULL;

-- RLS: INSERT/DELETE für Leitung (INSERT war zuvor nicht erlaubt)
CREATE POLICY "employees_insert_leitung"
  ON public.employees FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND e.role IN ('admin', 'abteilungsleiter')
    )
  );

CREATE POLICY "employees_delete_leitung"
  ON public.employees FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND e.role IN ('admin', 'abteilungsleiter')
    )
  );
