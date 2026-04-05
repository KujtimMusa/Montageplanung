import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  istGueltigeTokenZeichenfolge,
  resolveToken,
} from "@/lib/pwa/token-resolver";
import {
  monteurDarfEinsatzSehen,
  monteurIstEinsatzVertreter,
} from "@/lib/pwa/monteur-einsatz-zugriff";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") ?? "";
  const assignmentId = searchParams.get("assignmentId") ?? "";
  if (!istGueltigeTokenZeichenfolge(token) || !assignmentId) {
    return NextResponse.json(
      { error: "token und assignmentId erforderlich" },
      { status: 400 }
    );
  }

  const resolved = await resolveToken(token);
  if (!resolved || resolved.role === "customer") {
    return NextResponse.json({ error: "Ungültiger Token" }, { status: 403 });
  }

  const supabase = createServiceRoleClient();
  const { data: entry } = await supabase
    .from("time_entries")
    .select("id, checkin_at, checkout_at")
    .eq("employee_id", resolved.employeeId)
    .eq("assignment_id", assignmentId)
    .is("checkout_at", null)
    .maybeSingle();

  return NextResponse.json({
    hasOpenEntry: Boolean(entry),
    entry: entry
      ? { id: entry.id as string, checkin_at: entry.checkin_at as string }
      : undefined,
  });
}

export async function POST(request: Request) {
  let body: {
    token?: string;
    assignment_id?: string;
    project_id?: string | null;
    lat?: number | null;
    lng?: number | null;
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

  const assignmentId = body.assignment_id?.trim() ?? "";
  if (!assignmentId) {
    return NextResponse.json({ error: "assignment_id fehlt" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: assignment, error: aErr } = await supabase
    .from("assignments")
    .select("id, organization_id, employee_id, project_id, team_id")
    .eq("id", assignmentId)
    .maybeSingle();

  if (aErr || !assignment) {
    return NextResponse.json({ error: "Einsatz nicht gefunden" }, { status: 404 });
  }

  const darf = await monteurDarfEinsatzSehen(
    supabase,
    resolved.orgId,
    resolved.employeeId,
    {
      organization_id: assignment.organization_id as string,
      employee_id: (assignment.employee_id as string | null) ?? null,
      team_id: (assignment.team_id as string | null) ?? null,
    }
  );
  if (!darf) {
    return NextResponse.json({ error: "Kein Zugriff auf diesen Einsatz" }, { status: 403 });
  }

  if (
    !monteurIstEinsatzVertreter(
      (assignment.employee_id as string | null) ?? null,
      resolved.employeeId
    )
  ) {
    return NextResponse.json(
      { error: "Nur der eingeteilte Kollege kann hier stempeln." },
      { status: 403 }
    );
  }

  const { data: offen } = await supabase
    .from("time_entries")
    .select("id")
    .eq("employee_id", resolved.employeeId)
    .eq("assignment_id", assignmentId)
    .is("checkout_at", null)
    .maybeSingle();

  if (offen) {
    return NextResponse.json(
      { error: "Bereits eingestempelt", entry_id: offen.id },
      { status: 409 }
    );
  }

  const projectId =
    (body.project_id as string | null | undefined) ??
    (assignment.project_id as string | null);

  const { data: inserted, error: insErr } = await supabase
    .from("time_entries")
    .insert({
      organization_id: resolved.orgId,
      employee_id: resolved.employeeId,
      assignment_id: assignmentId,
      project_id: projectId,
      checkin_lat: body.lat ?? null,
      checkin_lng: body.lng ?? null,
    })
    .select("id, checkin_at")
    .single();

  if (insErr || !inserted) {
    return NextResponse.json(
      { error: insErr?.message ?? "Insert fehlgeschlagen" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    entry_id: inserted.id,
    checkin_at: inserted.checkin_at,
  });
}

export async function PATCH(request: Request) {
  let body: { token?: string; entry_id?: string };
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

  const entryId = body.entry_id?.trim() ?? "";
  if (!entryId) {
    return NextResponse.json({ error: "entry_id fehlt" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: row, error: fErr } = await supabase
    .from("time_entries")
    .select("id, employee_id, checkin_at, checkout_at")
    .eq("id", entryId)
    .maybeSingle();

  if (fErr || !row) {
    return NextResponse.json({ error: "Eintrag nicht gefunden" }, { status: 404 });
  }

  if ((row.employee_id as string) !== resolved.employeeId) {
    return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
  }

  if (row.checkout_at) {
    return NextResponse.json({ error: "Bereits ausgestempelt" }, { status: 409 });
  }

  const checkoutAt = new Date().toISOString();
  const { error: uErr } = await supabase
    .from("time_entries")
    .update({ checkout_at: checkoutAt })
    .eq("id", entryId);

  if (uErr) {
    return NextResponse.json({ error: uErr.message }, { status: 400 });
  }

  const start = new Date(row.checkin_at as string).getTime();
  const end = new Date(checkoutAt).getTime();
  const durationMinutes = Math.max(0, Math.round((end - start) / 60000));

  return NextResponse.json({
    duration_minutes: durationMinutes,
    checkout_at: checkoutAt,
  });
}
