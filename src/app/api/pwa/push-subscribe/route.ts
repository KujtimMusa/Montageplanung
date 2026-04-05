import { NextResponse } from "next/server";
import { resolveToken } from "@/lib/pwa/token-resolver";
import { createServiceRoleClient } from "@/lib/supabase/admin";
type Body = {
  token?: string;
  subscription?: {
    endpoint: string;
    keys?: { p256dh?: string; auth?: string };
  };
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON" }, { status: 400 });
  }

  const token = body.token?.trim();
  const sub = body.subscription;
  if (!token || !sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: "token oder subscription unvollständig" }, { status: 400 });
  }

  const resolved = await resolveToken(token);
  if (!resolved || resolved.role === "customer") {
    return NextResponse.json({ error: "Ungültig" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      employee_id: resolved.employeeId,
      organization_id: resolved.orgId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: "employee_id,endpoint" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
