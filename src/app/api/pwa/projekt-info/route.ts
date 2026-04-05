import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  istGueltigeTokenZeichenfolge,
  resolveToken,
} from "@/lib/pwa/token-resolver";

function nurVorname(name: string | null | undefined): string {
  if (!name) return "";
  const t = name.trim().split(/\s+/).filter(Boolean);
  return t[0] ?? "";
}

function formatZeit(t: string | null | undefined): string {
  if (!t) return "—";
  return t.slice(0, 5);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") ?? "";

  if (!istGueltigeTokenZeichenfolge(token)) {
    return NextResponse.json({ error: "Ungültiger Token" }, { status: 400 });
  }

  const resolved = await resolveToken(token);
  if (!resolved || resolved.role !== "customer") {
    return NextResponse.json({ error: "Ungültiger Token" }, { status: 403 });
  }

  const supabase = createServiceRoleClient();
  const projectId = resolved.projectId;

  const { data: project, error: pErr } = await supabase
    .from("projects")
    .select(
      "id,title,description,status,planned_start,planned_end,adresse,customer_id,organizations(name,logo_url)"
    )
    .eq("id", projectId)
    .maybeSingle();

  if (pErr || !project) {
    return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
  }

  const orgRow = project.organizations as
    | { name?: string; logo_url?: string | null }
    | { name?: string; logo_url?: string | null }[]
    | null;
  const org = Array.isArray(orgRow) ? orgRow[0] : orgRow;

  const { data: rawRows, error: aErr } = await supabase
    .from("assignments")
    .select(
      "id,date,start_time,end_time,status,employee_id,team_id,dienstleister_id"
    )
    .eq("project_id", projectId)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (aErr) {
    console.warn("[projekt-info] assignments:", aErr.message);
  }

  const rows = rawRows ?? [];
  const empIds = Array.from(
    new Set(
      rows.map((r) => r.employee_id as string | null).filter(Boolean) as string[]
    )
  );
  const teamIds = Array.from(
    new Set(
      rows.map((r) => r.team_id as string | null).filter(Boolean) as string[]
    )
  );
  const subIds = Array.from(
    new Set(
      rows
        .map((r) => r.dienstleister_id as string | null)
        .filter(Boolean) as string[]
    )
  );

  const [empRes, teamRes, subRes] = await Promise.all([
    empIds.length
      ? supabase.from("employees").select("id,name").in("id", empIds)
      : Promise.resolve({ data: [] as { id: string; name: string | null }[] }),
    teamIds.length
      ? supabase.from("teams").select("id,name").in("id", teamIds)
      : Promise.resolve({ data: [] as { id: string; name: string | null }[] }),
    subIds.length
      ? supabase
          .from("subcontractors")
          .select("id,company_name")
          .in("id", subIds)
      : Promise.resolve({
          data: [] as { id: string; company_name: string | null }[],
        }),
  ]);

  const empById = new Map(
    (empRes.data ?? []).map((e) => [e.id as string, e.name as string | null])
  );
  const teamById = new Map(
    (teamRes.data ?? []).map((t) => [t.id as string, t.name as string | null])
  );
  const subById = new Map(
    (subRes.data ?? []).map((s) => [
      s.id as string,
      s.company_name as string | null,
    ])
  );

  const einsaetze = rows.map((a) => {
    const eid = a.employee_id as string | null;
    const tid = a.team_id as string | null;
    const sid = a.dienstleister_id as string | null;
    const nameRaw = eid ? empById.get(eid) ?? null : null;
    const teamName = tid ? teamById.get(tid) ?? null : null;
    const partnerName = sid ? subById.get(sid) ?? null : null;

    const mitarbeiterName = (nameRaw ?? "").trim() || null;

    const teile: string[] = [];
    if (mitarbeiterName) teile.push(mitarbeiterName);
    if ((teamName ?? "").trim()) teile.push(`Team: ${(teamName ?? "").trim()}`);
    if ((partnerName ?? "").trim())
      teile.push(`Partner: ${(partnerName ?? "").trim()}`);

    const kurzbeschreibung =
      teile.length > 0 ? teile.join(" · ") : "Termin (Details folgen)";

    return {
      id: a.id as string,
      date: a.date as string,
      start_time: a.start_time as string,
      end_time: a.end_time as string,
      status: (a.status as string) ?? "geplant",
      vorname_mitarbeiter: nurVorname(nameRaw ?? null),
      mitarbeiter_name: mitarbeiterName,
      team_name: (teamName ?? "").trim() || null,
      partner_name: (partnerName ?? "").trim() || null,
      kurzbeschreibung,
      zeitraum_label: `${formatZeit(a.start_time as string)}–${formatZeit(a.end_time as string)} Uhr`,
    };
  });

  const { data: fotos } = await supabase
    .from("site_docs")
    .select("id,type,file_url,file_name,created_at")
    .eq("project_id", projectId)
    .in("type", ["foto_nachher", "foto_sonstiges"])
    .order("created_at", { ascending: false });

  const res = NextResponse.json({
    orgName: org?.name ?? resolved.orgName,
    orgLogoUrl: org?.logo_url ?? null,
    project: {
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      planned_start: project.planned_start,
      planned_end: project.planned_end,
      adresse: project.adresse,
    },
    einsaetze,
    fortschrittsFotos: fotos ?? [],
  });
  res.headers.set(
    "Cache-Control",
    "private, no-store, no-cache, must-revalidate"
  );
  return res;
}
