import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  istGueltigeTokenZeichenfolge,
  resolveToken,
} from "@/lib/pwa/token-resolver";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") ?? "";
  const assignmentId = searchParams.get("assignmentId");
  const projectId = searchParams.get("projectId");
  const typeFilter = searchParams.get("type");

  if (!istGueltigeTokenZeichenfolge(token)) {
    return NextResponse.json({ error: "Ungültiger Token" }, { status: 400 });
  }

  const resolved = await resolveToken(token);
  if (!resolved) {
    return NextResponse.json({ error: "Ungültiger Token" }, { status: 403 });
  }

  const supabase = createServiceRoleClient();
  let q = supabase
    .from("site_docs")
    .select("*")
    .eq("organization_id", resolved.orgId)
    .order("created_at", { ascending: false });

  if (resolved.role === "customer") {
    q = q.eq("project_id", resolved.projectId);
  } else {
    q = q.eq("employee_id", resolved.employeeId);
    if (assignmentId) q = q.eq("assignment_id", assignmentId);
    if (projectId) q = q.eq("project_id", projectId);
  }

  if (typeFilter) {
    if (typeFilter.startsWith("foto")) {
      q = q.like("type", "foto%");
    } else {
      q = q.eq("type", typeFilter);
    }
  }

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ docs: data ?? [] });
}

export async function POST(request: Request) {
  let body: {
    token?: string;
    project_id?: string;
    assignment_id?: string | null;
    type?: string;
    title?: string | null;
    content?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON" }, { status: 400 });
  }

  const token = body.token ?? "";
  if (!istGueltigeTokenZeichenfolge(token)) {
    return NextResponse.json({ error: "Ungültiger Token" }, { status: 400 });
  }

  const resolved = await resolveToken(token);
  if (!resolved || resolved.role === "customer") {
    return NextResponse.json({ error: "Ungültiger Token" }, { status: 403 });
  }

  const projectId = body.project_id?.trim() ?? "";
  const typ = body.type?.trim() ?? "";
  if (!projectId || !typ) {
    return NextResponse.json(
      { error: "project_id und type erforderlich" },
      { status: 400 }
    );
  }

  const supabase = createServiceRoleClient();

  const { data: proj, error: pErr } = await supabase
    .from("projects")
    .select("id, organization_id")
    .eq("id", projectId)
    .maybeSingle();

  if (pErr || !proj || (proj.organization_id as string) !== resolved.orgId) {
    return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
  }

  const { data: inserted, error: insErr } = await supabase
    .from("site_docs")
    .insert({
      organization_id: resolved.orgId,
      project_id: projectId,
      assignment_id: body.assignment_id ?? null,
      employee_id: resolved.employeeId,
      type: typ,
      title: body.title ?? null,
      content: body.content ?? null,
    })
    .select("id, created_at")
    .single();

  if (insErr || !inserted) {
    return NextResponse.json(
      { error: insErr?.message ?? "Speichern fehlgeschlagen" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    doc_id: inserted.id,
    created_at: inserted.created_at,
  });
}
