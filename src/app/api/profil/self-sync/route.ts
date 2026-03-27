import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

/**
 * Legt für den angemeldeten Nutzer eine employees-Zeile an, falls keine existiert
 * (z. B. ältere Logins vor Trigger, manuelle Auth-Einträge).
 * Nutzt Service Role nur serverseitig; es wird nur auth.uid() angelegt.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { fehler: "Nicht angemeldet." },
        { status: 401 }
      );
    }

    const { data: existing } = await supabase
      .from("employees")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, erstellt: false });
    }

    let admin;
    try {
      admin = createServiceRoleClient();
    } catch {
      return NextResponse.json(
        {
          fehler: "service_role",
          nachricht:
            "Auf dem Server fehlt SUPABASE_SERVICE_ROLE_KEY — bitte in Vercel/.env setzen oder einen Admin bitten, Ihr Profil in Supabase anzulegen.",
        },
        { status: 503 }
      );
    }

    const { count: mitarbeiterAnzahl, error: countErr } = await admin
      .from("employees")
      .select("id", { count: "exact", head: true });
    if (countErr) {
      return NextResponse.json({ fehler: countErr.message }, { status: 500 });
    }

    const ersterInDerDatenbank = (mitarbeiterAnzahl ?? 0) === 0;
    const rolle = ersterInDerDatenbank ? "admin" : "teamleiter";

    const meta = user.user_metadata as { name?: string } | undefined;
    const name =
      (meta?.name && String(meta.name).trim()) ||
      user.email?.split("@")[0] ||
      "Nutzer";

    const { error } = await admin.from("employees").insert({
      name,
      email: user.email ?? null,
      role: rolle,
      auth_user_id: user.id,
      active: true,
    });

    if (error) {
      return NextResponse.json(
        { fehler: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, erstellt: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler.";
    return NextResponse.json({ fehler: msg }, { status: 500 });
  }
}
