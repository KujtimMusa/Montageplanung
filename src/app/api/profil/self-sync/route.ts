import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    const { data: existing, error } = await supabase
      .from("employees")
      .select("id,organization_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ fehler: error.message }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json(
        { ok: true, erstellt: false, organization_id: null },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      erstellt: false,
      organization_id: existing.organization_id ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler.";
    return NextResponse.json({ fehler: msg }, { status: 500 });
  }
}
