import { NextRequest, NextResponse } from "next/server";
import { resolveToken } from "@/lib/pwa/token-resolver";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token fehlt" }, { status: 400 });
  }

  const resolved = await resolveToken(token);
  if (!resolved || resolved.role === "customer") {
    return NextResponse.json({ error: "Ungültiger Token" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("id, type, title, message, read, action_url, created_at")
    .eq("employee_id", resolved.employeeId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notifications: notifications ?? [] });
}

export async function PATCH(req: NextRequest) {
  let body: { token?: string; notificationId?: string; markAll?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON" }, { status: 400 });
  }

  const token = body.token;
  if (!token) {
    return NextResponse.json({ error: "token fehlt" }, { status: 400 });
  }

  const resolved = await resolveToken(token);
  if (!resolved || resolved.role === "customer") {
    return NextResponse.json({ error: "Ungültiger Token" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  if (body.markAll) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("employee_id", resolved.employeeId)
      .eq("read", false);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (!body.notificationId) {
    return NextResponse.json({ error: "notificationId fehlt" }, { status: 400 });
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", body.notificationId)
    .eq("employee_id", resolved.employeeId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
