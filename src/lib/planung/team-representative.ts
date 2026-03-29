import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Für DB-Constraints: Team-Einsätze brauchen einen zugeordneten Mitarbeiter.
 * Teamleiter oder erstes Mitglied – für Einzelauswahl.
 */
export async function getRepresentativeEmployeeId(
  supabase: SupabaseClient,
  teamId: string
): Promise<string | null> {
  const { data: team } = await supabase
    .from("teams")
    .select("leader_id")
    .eq("id", teamId)
    .maybeSingle();

  if (team?.leader_id) {
    return team.leader_id as string;
  }

  const { data: first } = await supabase
    .from("team_members")
    .select("employee_id")
    .eq("team_id", teamId)
    .limit(1)
    .maybeSingle();

  return (first?.employee_id as string | undefined) ?? null;
}

/**
 * Weist jedem Team einen anderen Mitarbeiter aus den Team-Mitgliedern zu,
 * sodass keine zwei Teams am selben Termin denselben employee_id bekommen
 * (erfüllt assignments_keine_ueberlappung).
 */
export async function assignDistinctRepresentativesForTeams(
  supabase: SupabaseClient,
  teamIds: string[],
  teamNameById: Map<string, string>
): Promise<{ byTeam: Map<string, string>; error: string | null }> {
  const byTeam = new Map<string, string>();
  if (teamIds.length === 0) {
    return { byTeam, error: null };
  }

  const unique = Array.from(new Set(teamIds));

  const { data: teamRows, error: teamErr } = await supabase
    .from("teams")
    .select("id, leader_id")
    .in("id", unique);

  if (teamErr) {
    return {
      byTeam,
      error: `Teams konnten nicht geladen werden: ${teamErr.message}`,
    };
  }

  const { data: memberRows, error: memErr } = await supabase
    .from("team_members")
    .select("team_id, employee_id")
    .in("team_id", unique);

  if (memErr) {
    return {
      byTeam,
      error: `Team-Mitglieder konnten nicht geladen werden: ${memErr.message}`,
    };
  }

  const membersByTeam = new Map<string, string[]>();
  for (const row of memberRows ?? []) {
    const tid = row.team_id as string;
    const eid = row.employee_id as string;
    if (!membersByTeam.has(tid)) membersByTeam.set(tid, []);
    membersByTeam.get(tid)!.push(eid);
  }

  const used = new Set<string>();

  for (const tid of unique) {
    const t = teamRows?.find((r) => r.id === tid);
    const memberList = [...(membersByTeam.get(tid) ?? [])].sort();
    const candidates: string[] = [];
    const lead = t?.leader_id as string | null | undefined;
    if (lead) candidates.push(lead);
    for (const eid of memberList) {
      if (!candidates.includes(eid)) candidates.push(eid);
    }
    const anzeigeName = teamNameById.get(tid) ?? "Team";
    if (candidates.length === 0) {
      return {
        byTeam,
        error: `Im Team „${anzeigeName}“ ist kein Mitarbeiter hinterlegt (Leiter/Mitglieder fehlen).`,
      };
    }
    const pick = candidates.find((eid) => !used.has(eid));
    if (!pick) {
      return {
        byTeam,
        error:
          `Zu viele Teams gleichzeitig: Für „${anzeigeName}“ ist kein eigener Mitarbeiter frei — alle Kandidaten (Leiter/Mitglieder) werden bereits von einem anderen ausgewählten Team an diesem Termin genutzt. Wählen Sie Teams mit unterschiedlichen Mitgliedern oder legen Sie getrennte Einsätze an.`,
      };
    }
    used.add(pick);
    byTeam.set(tid, pick);
  }

  return { byTeam, error: null };
}
