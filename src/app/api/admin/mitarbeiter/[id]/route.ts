import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { darfMitarbeiterVerwalten } from "@/lib/auth/angestellter";

const erlaubteRollen = [
  "admin",
  "abteilungsleiter",
  "teamleiter",
] as const;

/**
 * Rolle und/oder Aktiv-Status eines Mitarbeiters ändern.
 */
export async function PATCH(
  request: Request,
  kontext: { params: { id: string } }
) {
  const { id } = kontext.params;

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

  const body = (await request.json()) as {
    role?: string;
    active?: boolean;
  };

  const update: Record<string, unknown> = {};
  if (typeof body.active === "boolean") {
    update.active = body.active;
  }
  if (body.role !== undefined) {
    if (!erlaubteRollen.includes(body.role as (typeof erlaubteRollen)[number])) {
      return NextResponse.json({ fehler: "Ungültige Rolle." }, { status: 400 });
    }
    update.role = body.role;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ fehler: "Keine Änderungen." }, { status: 400 });
  }

  const { error } = await supabase.from("employees").update(update).eq("id", id);

  if (error) {
    return NextResponse.json({ fehler: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
