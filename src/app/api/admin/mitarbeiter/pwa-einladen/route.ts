import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { darfMitarbeiterVerwalten } from "@/lib/auth/angestellter";
import { templateMonteurWillkommen } from "@/lib/email-templates";

async function ladeResendKeys(
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

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const { data: profil } = await supabase
    .from("employees")
    .select("role, organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!darfMitarbeiterVerwalten(profil?.role)) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const orgIdCaller = profil?.organization_id as string | undefined;
  if (!orgIdCaller) {
    return NextResponse.json({ error: "Organisation unbekannt" }, { status: 400 });
  }

  const body = (await req.json()) as {
    mitarbeiterId?: string;
    email?: string;
    pwa_token?: string;
    name?: string;
  };
  const mitarbeiterId = body.mitarbeiterId?.trim();
  const email = body.email?.trim().toLowerCase();
  const pwa_token = body.pwa_token?.trim();
  const name = body.name?.trim() ?? "";

  if (!mitarbeiterId || !email || !pwa_token) {
    return NextResponse.json(
      { error: "mitarbeiterId, email und pwa_token erforderlich" },
      { status: 400 }
    );
  }

  const admin = createServiceRoleClient();
  const { data: emp } = await admin
    .from("employees")
    .select("id, email, pwa_token, role, organization_id, organizations(name)")
    .eq("id", mitarbeiterId)
    .maybeSingle();

  if (!emp || emp.organization_id !== orgIdCaller) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  if (String(emp.role ?? "").toLowerCase() !== "monteur") {
    return NextResponse.json({ error: "Nur für Monteur-Rolle" }, { status: 400 });
  }

  if (String(emp.email ?? "").trim().toLowerCase() !== email) {
    return NextResponse.json({ error: "E-Mail stimmt nicht" }, { status: 400 });
  }

  if (String(emp.pwa_token ?? "").trim() !== pwa_token) {
    return NextResponse.json({ error: "Token stimmt nicht" }, { status: 400 });
  }

  const basisUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    new URL(req.url).origin;
  const monteurLink = `${basisUrl}/m/${pwa_token}/projekte`;

  const orgRow = emp.organizations as
    | { name?: string }
    | { name?: string }[]
    | null;
  const firmenName = Array.isArray(orgRow) ? orgRow[0]?.name : orgRow?.name;

  const { apiKey, fromEmail } = await ladeResendKeys(admin, orgIdCaller);
  if (!apiKey || !fromEmail) {
    console.warn("[pwa-einladen] Resend nicht konfiguriert, E-Mail übersprungen");
    return NextResponse.json({ success: true, mailSent: false });
  }

  const tpl = templateMonteurWillkommen({
    monteurName: name || "Kollegin/Kollege",
    firmenName: firmenName ?? "",
    monteurLink,
  });

  try {
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
      const t = await res.text().catch(() => "");
      console.warn("[pwa-einladen] Resend fehlgeschlagen:", res.status, t);
    }
  } catch (e) {
    console.warn("[pwa-einladen] Resend Fehler:", e);
  }

  return NextResponse.json({ success: true, mailSent: true });
}
