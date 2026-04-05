import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { templateKundenTermineUpdate } from "@/lib/email-templates";

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

  let body: { projectId?: string; organizationId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 });
  }

  const { projectId, organizationId } = body;
  if (!projectId || !organizationId) {
    return NextResponse.json({ ok: false, reason: "parameter_fehlt" }, { status: 400 });
  }

  const { data: me } = await supabase
    .from("employees")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const meineOrg = me?.organization_id as string | undefined;
  if (!meineOrg || meineOrg !== organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createServiceRoleClient();
  const { data: proj, error: pErr } = await admin
    .from("projects")
    .select("id, organization_id, customer_id, customer_token, title")
    .eq("id", projectId)
    .maybeSingle();

  if (pErr || !proj) {
    return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
  }
  if ((proj.organization_id as string) !== organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const customerId = proj.customer_id as string | null;
  const customerToken = proj.customer_token as string | null;
  if (!customerId || !customerToken) {
    return NextResponse.json({ ok: true, skipped: "kein_kunde" });
  }

  const { data: kunde } = await admin
    .from("customers")
    .select("email, company_name, contact_name")
    .eq("id", customerId)
    .maybeSingle();

  const email = (kunde?.email as string | null)?.trim();
  if (!email) {
    return NextResponse.json({ ok: true, skipped: "keine_email" });
  }

  const { apiKey, fromEmail } = await ladeResend(admin, organizationId);
  if (!apiKey || !fromEmail) {
    return NextResponse.json({ ok: false, reason: "resend_nicht_konfiguriert" });
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const portalLink = `${appUrl}/k/${customerToken}`;

  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .maybeSingle();

  const tpl = templateKundenTermineUpdate({
    kundenName:
      (kunde?.contact_name as string | null)?.trim() ||
      (kunde?.company_name as string | null)?.trim() ||
      "Kunde",
    projektName: (proj.title as string) ?? "Projekt",
    firmenName: (org?.name as string) ?? "",
    portalLink,
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
    console.warn("[api/pwa/kunden-termin-update-mail] Resend:", res.status, errText);
    return NextResponse.json(
      { ok: false, reason: "resend_fehler" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
