import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Für DB-Constraints: assignments.employee_id ist NOT NULL.
 * Team-Einsätze nutzen Teamleiter oder erstes Mitglied als Vertreter.
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
