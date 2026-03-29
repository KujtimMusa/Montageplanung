import { createClient } from "@/lib/supabase/server";

export type AngestellterRolle =
  | "admin"
  | "abteilungsleiter"
  | "teamleiter"
  | "monteur";

export type AngestellterProfil = {
  id: string;
  name: string;
  email: string | null;
  role: AngestellterRolle;
  active: boolean;
  department_id: string | null;
  /**
   * Alle Abteilungen (Pivot employee_departments), Primär zuerst.
   * Ohne Pivot: [department_id] falls gesetzt, sonst [].
   */
  department_ids: string[];
  /** Primäres Team (employees.team_id), u. a. für Dashboard-Teamscope */
  team_id: string | null;
  auth_user_id: string | null;
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
    .select("id,name,email,role,active,department_id,team_id,auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as Omit<AngestellterProfil, "department_ids">;
  let department_ids: string[] = [];
  const { data: eds, error: edErr } = await supabase
    .from("employee_departments")
    .select("department_id, ist_primaer")
    .eq("employee_id", row.id);

  if (!edErr && eds?.length) {
    const sorted = [...eds].sort((a, b) =>
      a.ist_primaer === b.ist_primaer ? 0 : a.ist_primaer ? -1 : 1
    );
    department_ids = sorted
      .map((e) => e.department_id as string)
      .filter((id): id is string => Boolean(id));
  }
  if (department_ids.length === 0 && row.department_id) {
    department_ids = [row.department_id];
  }

  return { ...row, department_ids };
}

export function istAdmin(rolle: string | undefined): boolean {
  return rolle === "admin";
}

export function darfAlles(rolle: string | undefined): boolean {
  return rolle === "admin";
}

export function darfMitarbeiterVerwalten(rolle: string | undefined): boolean {
  return rolle === "admin" || rolle === "abteilungsleiter";
}

export function darfTeamsVerwalten(rolle: string | undefined): boolean {
  return (
    rolle === "admin" ||
    rolle === "abteilungsleiter" ||
    rolle === "teamleiter"
  );
}

export function istNurMonteur(rolle: string | undefined): boolean {
  return rolle === "monteur";
}
