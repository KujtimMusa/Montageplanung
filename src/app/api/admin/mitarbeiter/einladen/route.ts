import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { darfMitarbeiterVerwalten } from "@/lib/auth/angestellter";
import { templateKoordinatorWillkommen } from "@/lib/email-templates";

const KOORD_ROLLEN = [
  "admin",
  "koordinator",
  "geschaeftsfuehrer",
  "abteilungsleiter",
  "teamleiter",
];

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
    .select("role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!darfMitarbeiterVerwalten(profil?.role)) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const body = (await req.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "E-Mail fehlt" }, { status: 400 });
  }

  const basisUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    new URL(req.url).origin;

  const adminSupabase = createServiceRoleClient();
  const { error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${basisUrl}/login`,
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return NextResponse.json(
        { error: "E-Mail bereits registriert" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: empRow } = await adminSupabase
    .from("employees")
    .select("id, name, role, pwa_token, organization_id, organizations(name)")
    .eq("email", email)
    .maybeSingle();

  if (
    empRow?.pwa_token &&
    KOORD_ROLLEN.includes(String(empRow.role ?? "").toLowerCase()) &&
    empRow.organization_id
  ) {
    const orgRow = empRow.organizations as
      | { name?: string }
      | { name?: string }[]
      | null;
    const orgName = Array.isArray(orgRow) ? orgRow[0]?.name : orgRow?.name;
    const basisUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      new URL(req.url).origin;
    const pwaLink = `${basisUrl}/pwa/${empRow.pwa_token as string}`;
    const { apiKey, fromEmail } = await ladeResendKeys(
      adminSupabase,
      empRow.organization_id as string
    );
    if (apiKey && fromEmail) {
      const tpl = templateKoordinatorWillkommen({
        koordinatorName: (empRow.name as string) ?? "Kollegin",
        firmenName: orgName ?? "",
        pwaLink,
      });
      void fetch("https://api.resend.com/emails", {
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
      }).catch(() => {});
    }
  }

  return NextResponse.json({ success: true });
}
