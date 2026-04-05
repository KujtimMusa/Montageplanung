import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
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
    regenerate_pwa_token?: boolean;
    role?: string;
    active?: boolean;
    department_id?: string | null;
    /** Mehrere Abteilungen (employee_departments); setzt employees.department_id auf Primär */
    department_ids?: string[] | null;
    primaer_abteilung_id?: string | null;
    team_id?: string | null;
    /** Mehrere Teams (team_members); überschreibt team_id beim Sync */
    team_ids?: string[] | null;
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

  if (body.regenerate_pwa_token === true) {
    if (!canManageAll) {
      return NextResponse.json(
        { fehler: "Nur Leitung kann den PWA-Token zurücksetzen." },
        { status: 403 }
      );
    }
    try {
      const admin = createServiceRoleClient();
      const { error: reErr } = await admin
        .from("employees")
        .update({ pwa_token: randomUUID() })
        .eq("id", id);
      if (reErr) {
        return NextResponse.json({ fehler: reErr.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json(
        { fehler: e instanceof Error ? e.message : "Serverfehler" },
        { status: 500 }
      );
    }
  }

  if (!canManageAll && selbstNurMonteurTeamleiter && body.active !== undefined) {
    return NextResponse.json(
      { fehler: "Nur Leitung kann den Aktiv-Status ändern." },
      { status: 403 }
    );
  }

  const deptTeamAnfrage =
    body.department_id !== undefined ||
    body.department_ids !== undefined ||
    body.team_id !== undefined ||
    body.team_ids !== undefined;
  if (deptTeamAnfrage && !canManageAll) {
    return NextResponse.json(
      { fehler: "Keine Berechtigung für Abteilung/Team." },
      { status: 403 }
    );
  }

  const expliziteAbteilungen = body.department_ids !== undefined;

  let pivotIds: string[] = [];
  let pivotPrimaer: string | null = null;

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

  if (expliziteAbteilungen) {
    pivotIds = Array.from(
      new Set(
        (body.department_ids ?? []).filter(
          (x): x is string => typeof x === "string" && x.length > 0
        )
      )
    );
    const gewPrimaer =
      body.primaer_abteilung_id &&
      pivotIds.includes(body.primaer_abteilung_id)
        ? body.primaer_abteilung_id
        : pivotIds[0] ?? null;
    pivotPrimaer = gewPrimaer;
    department_id = gewPrimaer;
    update.department_id = department_id;
  } else if (body.department_id !== undefined) {
    department_id =
      body.department_id === "" || body.department_id === null
        ? null
        : body.department_id;
    update.department_id = department_id;
    pivotIds = department_id ? [department_id] : [];
    pivotPrimaer = department_id;
  }

  /** Team-IDs für Validierung und team_members (Reihenfolge = Primärteam zuerst) */
  let teamIdsZumSync: string[] | null = null;
  if (body.team_ids !== undefined) {
    teamIdsZumSync = Array.from(
      new Set(
        (body.team_ids ?? []).filter(
          (x): x is string => typeof x === "string" && x.length > 0
        )
      )
    );
    update.team_id = teamIdsZumSync[0] ?? null;
  } else if (body.team_id !== undefined) {
    const tid =
      body.team_id === "" || body.team_id === null ? null : body.team_id;
    update.team_id = tid;
    teamIdsZumSync = tid ? [tid] : [];
  }

  if (teamIdsZumSync !== null && teamIdsZumSync.length > 0) {
    const teamDeptList: (string | null)[] = [];
    for (const tid of teamIdsZumSync) {
      const { data: teamRow } = await supabase
        .from("teams")
        .select("department_id")
        .eq("id", tid)
        .maybeSingle();
      teamDeptList.push((teamRow?.department_id as string | null) ?? null);
    }
    const distinct = Array.from(
      new Set(teamDeptList.filter((d): d is string => Boolean(d)))
    );

    if (expliziteAbteilungen) {
      if (pivotIds.length > 0) {
        for (const tdep of teamDeptList) {
          if (tdep && !pivotIds.includes(tdep)) {
            return NextResponse.json(
              {
                fehler:
                  "Ein gewähltes Team gehört nicht zu den ausgewählten Abteilungen.",
              },
              { status: 400 }
            );
          }
        }
      }
    } else {
      const hauptAbteilungAktiv =
        body.department_id !== undefined &&
        department_id !== null &&
        department_id !== "";

      if (hauptAbteilungAktiv) {
        const ziel = department_id as string;
        for (const tdep of teamDeptList) {
          if (tdep && tdep !== ziel) {
            return NextResponse.json(
              {
                fehler:
                  "Ein gewähltes Team passt nicht zur gewählten Haupt-Abteilung.",
              },
              { status: 400 }
            );
          }
        }
      } else {
        if (distinct.length > 1) {
          update.department_id = null;
        } else if (distinct.length === 1) {
          update.department_id = distinct[0] ?? null;
        }
      }
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ fehler: "Keine Änderungen." }, { status: 400 });
  }

  const { error } = await supabase.from("employees").update(update).eq("id", id);

  if (error) {
    return NextResponse.json({ fehler: error.message }, { status: 400 });
  }

  if (teamIdsZumSync !== null) {
    await supabase.from("team_members").delete().eq("employee_id", id);
    for (const tid of teamIdsZumSync) {
      const { error: e2 } = await supabase.from("team_members").insert({
        team_id: tid,
        employee_id: id,
        team_role: "mitglied",
      });
      if (e2) {
        return NextResponse.json({ fehler: e2.message }, { status: 400 });
      }
    }
  }

  if (expliziteAbteilungen) {
    await supabase.from("employee_departments").delete().eq("employee_id", id);
    if (pivotIds.length > 0) {
      const { error: e3 } = await supabase.from("employee_departments").insert(
        pivotIds.map((d) => ({
          employee_id: id,
          department_id: d,
          ist_primaer: d === pivotPrimaer,
        }))
      );
      if (e3) {
        return NextResponse.json({ fehler: e3.message }, { status: 400 });
      }
    }
  } else if (body.department_id !== undefined) {
    await supabase.from("employee_departments").delete().eq("employee_id", id);
    if (department_id) {
      const { error: e3 } = await supabase.from("employee_departments").insert({
        employee_id: id,
        department_id,
        ist_primaer: true,
      });
      if (e3) {
        return NextResponse.json({ fehler: e3.message }, { status: 400 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
