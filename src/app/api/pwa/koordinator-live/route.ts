import { NextRequest, NextResponse } from "next/server";
import {
  istGueltigeTokenZeichenfolge,
  resolveToken,
} from "@/lib/pwa/token-resolver";
import { createServiceRoleClient } from "@/lib/supabase/admin";

/** Live-Einstempelungen für Koordinator-PWA (token-basiert). */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!istGueltigeTokenZeichenfolge(token)) {
    return NextResponse.json({ error: "Ungültiger Token" }, { status: 400 });
  }

  const resolved = await resolveToken(token);
  if (!resolved || resolved.role !== "coordinator") {
    return NextResponse.json({ error: "Verboten" }, { status: 403 });
  }

  const supabase = createServiceRoleClient();
  const { data: emps } = await supabase
    .from("employees")
    .select("id")
    .eq("organization_id", resolved.orgId);

  const ids = (emps ?? []).map((e) => e.id as string);
  if (ids.length === 0) {
    return NextResponse.json({ eingestempelt: [] });
  }

  const { data: rows, error } = await supabase
    .from("time_entries")
    .select("id, employee_id, checkin_at, employees(name)")
    .in("employee_id", ids)
    .is("checkout_at", null)
    .order("checkin_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const eingestempelt = (rows ?? []).map((r) => {
    const emp = r.employees as { name?: string } | null;
    return {
      id: r.id as string,
      employee_id: r.employee_id as string,
      mitarbeiter_name: emp?.name ?? "—",
      checkin_at: r.checkin_at as string,
    };
  });

  return NextResponse.json({ eingestempelt });
}
