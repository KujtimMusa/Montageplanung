import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { templateKundenZugang } from "@/lib/email-templates";

async function ladeResend(
  admin: ReturnType<typeof createServiceRoleClient>,
  organizationId: string
): Promise<{ apiKey: string; fromEmail: string }> {
  const { data: rows } = await admin
    .from("settings")
    .select("key,value")
    .eq("organization_id", organizationId)
    .in("key", ["resend_api_key", "resend_from_email"]);

  const map = Object.fromEntries(
    (rows ?? []).map((r) => [r.key as string, r.value ?? ""])
  );
  let apiKey =
    String(map.resend_api_key ?? "").trim() ||
    process.env.RESEND_API_KEY?.trim() ||
    "";
  let fromEmail =
    String(map.resend_from_email ?? "").trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "";

  if (!apiKey || !fromEmail) {
    const { data: fallback } = await admin
      .from("settings")
      .select("key,value")
      .in("key", ["resend_api_key", "resend_from_email"])
      .is("organization_id", null);
    const fb = Object.fromEntries(
      (fallback ?? []).map((r) => [r.key as string, r.value ?? ""])
    );
    apiKey = apiKey || String(fb.resend_api_key ?? "").trim();
    fromEmail = fromEmail || String(fb.resend_from_email ?? "").trim();
  }

  return { apiKey, fromEmail };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    projektId?: string;
    customerToken?: string;
    kundenEmail?: string;
    kundenName?: string;
    projektName?: string;
    orgId?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 });
  }

  const {
    projektId,
    customerToken,
    kundenEmail,
    kundenName,
    projektName,
    orgId,
  } = body;

  if (!projektId || !customerToken || !orgId || !projektName) {
    return NextResponse.json(
      { ok: false, reason: "parameter_fehlt" },
      { status: 400 }
    );
  }

  const email = (kundenEmail ?? "").trim();
  if (!email) {
    return NextResponse.json({ ok: false, reason: "keine_email" });
  }

  const { data: me } = await supabase
    .from("employees")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const meineOrg = me?.organization_id as string | undefined;
  if (!meineOrg || meineOrg !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createServiceRoleClient();
  const { data: proj, error: pErr } = await admin
    .from("projects")
    .select("id, organization_id, customer_token")
    .eq("id", projektId)
    .maybeSingle();

  if (pErr || !proj) {
    return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
  }
  if ((proj.organization_id as string) !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if ((proj.customer_token as string) !== customerToken) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { apiKey, fromEmail } = await ladeResend(admin, orgId);
  if (!apiKey || !fromEmail) {
    return NextResponse.json({ ok: false, reason: "resend_nicht_konfiguriert" });
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const kundenLink = `${appUrl}/k/${customerToken}`;

  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .maybeSingle();

  const tpl = templateKundenZugang({
    kundenName: kundenName?.trim() || "Kunde",
    projektName,
    firmenName: (org?.name as string) ?? "",
    kundenLink,
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: email,
      subject: tpl.subject,
      html: tpl.html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.warn("[api/pwa/kunden-zugang-mail] Resend:", res.status, errText);
    return NextResponse.json(
      { ok: false, reason: "resend_fehler" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
