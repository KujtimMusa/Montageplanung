import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { darfMitarbeiterVerwalten } from "@/lib/auth/angestellter";

/**
 * Einladung per E-Mail (Supabase Admin API).
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 });
    }

    const { data: ich } = await supabase
      .from("employees")
      .select("role")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!darfMitarbeiterVerwalten(ich?.role)) {
      return NextResponse.json({ fehler: "Keine Berechtigung." }, { status: 403 });
    }

    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ fehler: "E-Mail fehlt." }, { status: 400 });
    }

    const basisUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      new URL(request.url).origin;

    const admin = createServiceRoleClient();
    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${basisUrl}/login`,
    });

    if (error) {
      return NextResponse.json({ fehler: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const nachricht = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.json({ fehler: nachricht }, { status: 500 });
  }
}
