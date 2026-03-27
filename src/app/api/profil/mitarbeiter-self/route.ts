import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

/**
 * Liefert die employees-Zeile des angemeldeten Nutzers (auth_user_id).
 * Nutzt bei Bedarf Service Role, damit die Zeile auch bei RLS-/Cache-Problemen
 * der Listenabfrage sichtbar bleibt — nur eigene Zeile.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ mitarbeiter: null }, { status: 401 });
  }

  const authUid = user.id;

  const spaltenVoll =
    "id,name,email,role,active,department_id,auth_user_id,phone,whatsapp,team_id,qualifikationen";
  const spaltenBasis =
    "id,name,email,role,active,department_id,auth_user_id,phone,whatsapp";

  async function ladenMitFallback(client: SupabaseClient, uid: string) {
    let r = await client
      .from("employees")
      .select(spaltenVoll)
      .eq("auth_user_id", uid)
      .maybeSingle();
    if (
      r.error &&
      (r.error.message.includes("qualifikationen") ||
        r.error.message.includes("team_id") ||
        r.error.message.includes("schema cache"))
    ) {
      r = await client
        .from("employees")
        .select(spaltenBasis)
        .eq("auth_user_id", uid)
        .maybeSingle();
    }
    return r;
  }

  let { data, error } = await ladenMitFallback(supabase, authUid);

  if (error || !data) {
    try {
      const admin = createServiceRoleClient();
      const r = await ladenMitFallback(admin, authUid);
      data = r.data;
      error = r.error;
    } catch {
      return NextResponse.json({ mitarbeiter: null, fehler: "service_role" });
    }
  }

  if (error) {
    return NextResponse.json({ fehler: error.message }, { status: 400 });
  }

  return NextResponse.json({ mitarbeiter: data });
}
