import type { createServiceRoleClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createServiceRoleClient>;

/** Alle team_ids, in denen der Mitarbeiter Mitglied ist. */
export async function teamIdsFuerMitarbeiter(
  supabase: AdminClient,
  employeeId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("employee_id", employeeId);
  return Array.from(
    new Set((data ?? []).map((r) => r.team_id as string).filter(Boolean))
  );
}

export type AssignmentZugriffZeile = {
  organization_id: string;
  employee_id: string | null;
  team_id: string | null;
};

/** Einsatz sichtbar: eigener Vertreter-Eintrag oder Teammitglied beim gleichen team_id. */
export async function monteurDarfEinsatzSehen(
  supabase: AdminClient,
  orgId: string,
  employeeId: string,
  assignment: AssignmentZugriffZeile
): Promise<boolean> {
  if ((assignment.organization_id as string) !== orgId) return false;
  if (assignment.employee_id === employeeId) return true;
  if (!assignment.team_id) return false;
  const teams = await teamIdsFuerMitarbeiter(supabase, employeeId);
  return teams.includes(assignment.team_id as string);
}

/** Nur der als employee_id gespeicherte Vertreter darf stempeln (Zeiterfassung). */
export function monteurIstEinsatzVertreter(
  assignmentEmployeeId: string | null,
  employeeId: string
): boolean {
  return assignmentEmployeeId === employeeId;
}

const ASSIGNMENT_LIST_SELECT = `id,date,start_time,end_time,status,notes,project_title,team_id,
  project_id, projects(id,title,adresse,customer_id, customers(company_name,address,city,phone))`;

/**
 * Alle Einsätze für die Monteur-Liste: eigene Vertreter-Zeilen + Team-Einsätze (gleiches Team).
 */
export async function ladeMonteurEinsaetzeListe(
  supabase: AdminClient,
  opts: { employeeId: string; orgId: string; grenze: string }
): Promise<{ rows: unknown[]; error: { message: string } | null }> {
  const statusDatumOder =
    `status.neq.abgeschlossen,date.gte.${opts.grenze}`;

  const { data: direkt, error: e1 } = await supabase
    .from("assignments")
    .select(ASSIGNMENT_LIST_SELECT)
    .eq("employee_id", opts.employeeId)
    .eq("organization_id", opts.orgId)
    .or(statusDatumOder)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (e1) {
    return { rows: [], error: e1 };
  }

  const teamIds = await teamIdsFuerMitarbeiter(supabase, opts.employeeId);
  let teamRows: unknown[] = [];
  if (teamIds.length > 0) {
    const { data: viaTeam, error: e2 } = await supabase
      .from("assignments")
      .select(ASSIGNMENT_LIST_SELECT)
      .in("team_id", teamIds)
      .eq("organization_id", opts.orgId)
      .neq("employee_id", opts.employeeId)
      .or(statusDatumOder)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (e2) {
      return { rows: [], error: e2 };
    }
    teamRows = viaTeam ?? [];
  }

  const byId = new Map<string, unknown>();
  for (const r of [...(direkt ?? []), ...teamRows]) {
    const id = (r as { id: string }).id;
    if (id) byId.set(id, r);
  }
  return { rows: Array.from(byId.values()), error: null };
}

const KURZ_SELECT = "id,date,start_time,end_time,status,projects(title)";

/** Einsätze im Datumsbereich: direkt zugewiesen oder über Teamrolle. */
export async function ladeMonteurEinsaetzeZeitraum(
  supabase: AdminClient,
  opts: {
    employeeId: string;
    orgId: string;
    von: string;
    bis: string;
    limit?: number;
  }
): Promise<{ rows: unknown[]; error: { message: string } | null }> {
  const lim = opts.limit ?? 50;

  const { data: d1, error: e1 } = await supabase
    .from("assignments")
    .select(KURZ_SELECT)
    .eq("employee_id", opts.employeeId)
    .eq("organization_id", opts.orgId)
    .gte("date", opts.von)
    .lte("date", opts.bis)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(lim);

  if (e1) return { rows: [], error: e1 };

  const teamIds = await teamIdsFuerMitarbeiter(supabase, opts.employeeId);
  let d2: unknown[] = [];
  if (teamIds.length > 0) {
    const { data: viaTeam, error: e2 } = await supabase
      .from("assignments")
      .select(KURZ_SELECT)
      .in("team_id", teamIds)
      .eq("organization_id", opts.orgId)
      .neq("employee_id", opts.employeeId)
      .gte("date", opts.von)
      .lte("date", opts.bis)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(lim);

    if (e2) return { rows: [], error: e2 };
    d2 = viaTeam ?? [];
  }

  const byId = new Map<string, unknown>();
  for (const r of [...(d1 ?? []), ...d2]) {
    const id = (r as { id: string }).id;
    if (id) byId.set(id, r);
  }
  const sorted = Array.from(byId.values()).sort((a, b) => {
    const da = (a as { date: string }).date;
    const db = (b as { date: string }).date;
    if (da !== db) return da.localeCompare(db);
    const sa = (a as { start_time: string }).start_time;
    const sb = (b as { start_time: string }).start_time;
    return sa.localeCompare(sb);
  });
  return { rows: sorted.slice(0, lim), error: null };
}
