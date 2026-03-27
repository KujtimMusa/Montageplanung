-- Neue Nutzer: Standardrolle teamleiter (Zugriff auf Teams/Stammdaten im Pilot).
-- Montage-Monteur kann später von der Leitung auf "monteur" gesetzt werden.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.employees (name, email, role, auth_user_id, active)
  VALUES (
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
      SPLIT_PART(NEW.email, '@', 1)
    ),
    NEW.email,
    'teamleiter',
    NEW.id,
    true
  );
  RETURN NEW;
END;
$$;
