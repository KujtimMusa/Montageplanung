import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { darfMitarbeiterVerwalten } from "@/lib/auth/angestellter";

const erlaubteRollen = [
  "admin",
  "abteilungsleiter",
  "teamleiter",
  "monteur",
] as const;

/**
 * Rolle, Aktiv-Status, Abteilung und Team eines Mitarbeiters ändern.
 */
export async function PATCH(
  request: Request,
  kontext: { params: { id: string } }
) {
  const { id } = kontext.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 });
  }

  const { data: ich } = await supabase
    .from("employees")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const body = (await request.json()) as {
    role?: string;
    active?: boolean;
    department_id?: string | null;
    team_id?: string | null;
  };

  const canManageAll = darfMitarbeiterVerwalten(ich?.role);
  const selbstNurMonteurTeamleiter =
    ich &&
    id === ich.id &&
    ich.role !== undefined &&
    ["monteur", "teamleiter"].includes(ich.role as string) &&
    body.role !== undefined &&
    ["monteur", "teamleiter"].includes(body.role as string);

  if (!canManageAll && !selbstNurMonteurTeamleiter) {
    return NextResponse.json({ fehler: "Keine Berechtigung." }, { status: 403 });
  }

  if (!canManageAll && selbstNurMonteurTeamleiter && body.active !== undefined) {
    return NextResponse.json(
      { fehler: "Nur Leitung kann den Aktiv-Status ändern." },
      { status: 403 }
    );
  }

  const deptTeamAnfrage =
    body.department_id !== undefined || body.team_id !== undefined;
  if (deptTeamAnfrage && !canManageAll) {
    return NextResponse.json(
      { fehler: "Keine Berechtigung für Abteilung/Team." },
      { status: 403 }
    );
  }

  const update: Record<string, unknown> = {};
  if (typeof body.active === "boolean") {
    update.active = body.active;
  }
  if (body.role !== undefined) {
    if (!erlaubteRollen.includes(body.role as (typeof erlaubteRollen)[number])) {
      return NextResponse.json({ fehler: "Ungültige Rolle." }, { status: 400 });
    }
    update.role = body.role;
  }

  let department_id: string | null | undefined;
  let team_id: string | null | undefined;

  if (body.department_id !== undefined) {
    department_id =
      body.department_id === "" || body.department_id === null
        ? null
        : body.department_id;
    update.department_id = department_id;
  }
  if (body.team_id !== undefined) {
    team_id =
      body.team_id === "" || body.team_id === null ? null : body.team_id;
    update.team_id = team_id;
  }

  if (
    department_id !== undefined &&
    team_id !== undefined &&
    team_id &&
    department_id
  ) {
    const { data: teamRow } = await supabase
      .from("teams")
      .select("department_id")
      .eq("id", team_id)
      .maybeSingle();
    const tdep = teamRow?.department_id as string | null | undefined;
    if (tdep && tdep !== department_id) {
      return NextResponse.json(
        { fehler: "Team passt nicht zur gewählten Abteilung." },
        { status: 400 }
      );
    }
  } else if (team_id !== undefined && team_id && department_id === undefined) {
    const { data: emp } = await supabase
      .from("employees")
      .select("department_id")
      .eq("id", id)
      .maybeSingle();
    const edep = emp?.department_id as string | null;
    const { data: teamRow } = await supabase
      .from("teams")
      .select("department_id")
      .eq("id", team_id)
      .maybeSingle();
    const tdep = teamRow?.department_id as string | null | undefined;
    if (edep && tdep && tdep !== edep) {
      return NextResponse.json(
        { fehler: "Team passt nicht zur gewählten Abteilung." },
        { status: 400 }
      );
    }
  } else if (
    department_id !== undefined &&
    team_id !== undefined &&
    team_id &&
    !department_id
  ) {
    const { data: teamRow } = await supabase
      .from("teams")
      .select("department_id")
      .eq("id", team_id)
      .maybeSingle();
    if (teamRow?.department_id) {
      return NextResponse.json(
        { fehler: "Team gehört zu einer Abteilung — bitte Abteilung wählen." },
        { status: 400 }
      );
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ fehler: "Keine Änderungen." }, { status: 400 });
  }

  const { error } = await supabase.from("employees").update(update).eq("id", id);

  if (error) {
    return NextResponse.json({ fehler: error.message }, { status: 400 });
  }

  if (body.team_id !== undefined) {
    await supabase.from("team_members").delete().eq("employee_id", id);
    const finalTeamId =
      body.team_id === "" || body.team_id === null ? null : body.team_id;
    if (finalTeamId) {
      const { error: e2 } = await supabase.from("team_members").insert({
        team_id: finalTeamId,
        employee_id: id,
        team_role: "mitglied",
      });
      if (e2) {
        return NextResponse.json({ fehler: e2.message }, { status: 400 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
