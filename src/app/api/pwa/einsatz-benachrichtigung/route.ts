import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendeEinsatzBenachrichtigung } from "@/lib/einsatz-benachrichtigung";
import type { EinsatzBenachrichtigungParams } from "@/lib/einsatz-benachrichtigung";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: EinsatzBenachrichtigungParams;
  try {
    body = (await request.json()) as EinsatzBenachrichtigungParams;
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 });
  }

  if (!body.organizationId || !body.assignmentId || !body.datum) {
    return NextResponse.json(
      { error: "organizationId, assignmentId und datum erforderlich" },
      { status: 400 }
    );
  }

  const { data: me } = await supabase
    .from("employees")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const meineOrg = me?.organization_id as string | undefined;
  if (!meineOrg || meineOrg !== body.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  void sendeEinsatzBenachrichtigung(body).catch((e) => {
    console.warn("[api/pwa/einsatz-benachrichtigung]", e);
  });

  return NextResponse.json({ ok: true });
}
