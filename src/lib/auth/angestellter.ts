import { createClient } from "@/lib/supabase/server";

export type AngestellterProfil = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  active: boolean;
  department_id: string | null;
};

/**
 * Eingeloggten Nutzer als employees-Zeile laden (über auth_user_id).
 */
export async function ladeAngestelltenProfil(): Promise<AngestellterProfil | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("employees")
    .select("id,name,email,role,active,department_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as AngestellterProfil;
}

export function darfMitarbeiterVerwalten(rolle: string | undefined): boolean {
  return rolle === "admin" || rolle === "abteilungsleiter";
}
