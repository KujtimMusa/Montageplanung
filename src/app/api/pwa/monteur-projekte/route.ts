import { NextResponse } from "next/server";
import { format } from "date-fns";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  istGueltigeTokenZeichenfolge,
  resolveToken,
} from "@/lib/pwa/token-resolver";
import { ladeMonteurEinsaetzeListe } from "@/lib/pwa/monteur-einsatz-zugriff";

type Zeile = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string | null;
  project_title?: string | null;
  project_id: string | null;
  projects: unknown;
};

/** JSON für Monteur-PWA /projekte (Client-Page). */
export async function GET(request: Request) {
  const token =
    new URL(request.url).searchParams.get("token")?.trim() ?? "";
  if (!istGueltigeTokenZeichenfolge(token)) {
    return NextResponse.json({ error: "Ungültiger Token" }, { status: 400 });
  }

  const resolved = await resolveToken(token);
  if (!resolved || resolved.role === "customer") {
    return NextResponse.json({ error: "Ungültig" }, { status: 403 });
  }

  const supabase = createServiceRoleClient();
  const heute = format(new Date(), "yyyy-MM-dd");
  const grenze = format(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    "yyyy-MM-dd"
  );

  const { rows: rowsRaw, error: listeErr } = await ladeMonteurEinsaetzeListe(
    supabase,
    {
      employeeId: resolved.employeeId,
      orgId: resolved.orgId,
      grenze,
    }
  );

  if (listeErr) {
    return NextResponse.json(
      { error: "Einsätze konnten nicht geladen werden." },
      { status: 500 }
    );
  }

  const rows = (rowsRaw ?? []).filter((raw) => {
    const a = raw as Zeile;
    const st = String(a.status ?? "").toLowerCase();
    const d = a.date as string;
    if (st !== "abgeschlossen") return true;
    return d >= grenze;
  }) as Zeile[];

  const liste = rows;
  const projectIds = Array.from(
    new Set(
      liste
        .map((r) => r.project_id as string | null)
        .filter((x): x is string => Boolean(x))
    )
  );
  const dates = Array.from(new Set(liste.map((r) => r.date as string)));

  const teamMap: Record<string, { name: string; role: string }[]> = {};
  if (projectIds.length > 0 && dates.length > 0) {
    const { data: peers } = await supabase
      .from("assignments")
      .select("project_id,date,employee_id, employees(name,role)")
      .in("project_id", projectIds)
      .in("date", dates)
      .neq("employee_id", resolved.employeeId);

    for (const p of peers ?? []) {
      const pid = p.project_id as string;
      const d = p.date as string;
      const key = `${pid}|${d}`;
      const emp = p.employees as
        | { name?: string; role?: string }
        | { name?: string; role?: string }[]
        | null;
      const e = Array.isArray(emp) ? emp[0] : emp;
      if (!e?.name) continue;
      if (!teamMap[key]) teamMap[key] = [];
      teamMap[key].push({ name: e.name, role: (e.role as string) ?? "" });
    }
  }

  const sorted = [...liste].sort((a, b) => {
    const da = a.date as string;
    const db = b.date as string;
    if (da === heute && db !== heute) return -1;
    if (db === heute && da !== heute) return 1;
    return da.localeCompare(db);
  });

  return NextResponse.json({
    orgName: resolved.orgName,
    heute,
    token,
    rows: sorted,
    teamMap,
  });
}
