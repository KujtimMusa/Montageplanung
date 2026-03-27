import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Personio-Synchronisation (Platzhalter — echte API-Anbindung folgt).
 * POST: liest API-Key/Subdomain aus settings, aktualisiert last_sync.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { data: keys } = await supabase
    .from("settings")
    .select("key,value")
    .in("key", ["personio_api_key", "personio_subdomain"]);

  const map = Object.fromEntries((keys ?? []).map((r) => [r.key, r.value]));
  if (!map.personio_api_key?.trim() || !map.personio_subdomain?.trim()) {
    return NextResponse.json(
      {
        error: "personio_config",
        message: "Personio API-Key und Subdomain in den Einstellungen hinterlegen.",
      },
      { status: 400 }
    );
  }

  const ts = new Date().toISOString();
  await supabase.from("settings").upsert(
    { key: "personio_last_sync", value: ts, updated_at: ts },
    { onConflict: "key" }
  );

  return NextResponse.json({
    ok: true,
    message:
      "Sync-Zeitstempel gespeichert. Vollständige Personio-API-Integration ist in Arbeit.",
    syncedAt: ts,
    imported: 0,
  });
}
