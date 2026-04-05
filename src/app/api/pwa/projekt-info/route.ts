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

  const { data: assignments } = await supabase
    .from("assignments")
    .select("id,date,start_time,end_time,status,employee_id,employees(name)")
    .eq("project_id", projectId)
    .order("date", { ascending: true });

  const einsaetze = (assignments ?? []).map((a) => {
    const emp = a.employees as
      | { name?: string | null }
      | { name?: string | null }[]
      | null;
    const nameRaw = Array.isArray(emp) ? emp[0]?.name : emp?.name;
    return {
      id: a.id as string,
      date: a.date as string,
      start_time: a.start_time as string,
      end_time: a.end_time as string,
      status: a.status as string,
      vorname_mitarbeiter: nurVorname(nameRaw ?? null),
    };
  });

  const { data: fotos } = await supabase
    .from("site_docs")
    .select("id,type,file_url,file_name,created_at")
    .eq("project_id", projectId)
    .in("type", ["foto_nachher", "foto_sonstiges"])
    .order("created_at", { ascending: false });

  return NextResponse.json({
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
}
