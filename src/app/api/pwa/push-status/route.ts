import { NextResponse } from "next/server";
import { resolveToken } from "@/lib/pwa/token-resolver";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type StatusBody = {
  token?: string;
  status?: "denied" | "unsupported";
};

export async function POST(req: Request) {
  let body: StatusBody;
  try {
    body = (await req.json()) as StatusBody;
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON" }, { status: 400 });
  }

  const token = body.token?.trim();
  const status = body.status;
  if (!token || (status !== "denied" && status !== "unsupported")) {
    return NextResponse.json({ error: "token oder status ungültig" }, { status: 400 });
  }

  const resolved = await resolveToken(token);
  if (!resolved || resolved.role === "customer") {
    return NextResponse.json({ error: "Ungültig" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("employees")
    .update({ push_status: status })
    .eq("id", resolved.employeeId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
