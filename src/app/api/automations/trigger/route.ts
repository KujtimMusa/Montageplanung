import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type AutomationTyp =
  | "krankmeldung"
  | "neuer_einsatz"
  | "projekt_ueberfaellig"
  | "dienstleister_absage";

type TriggerBody = {
  typ?: AutomationTyp;
  payload?: Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 });
  }

  const { typ, payload = {} } = (await req.json().catch(() => ({}))) as TriggerBody;
  if (!typ) {
    return NextResponse.json({ fehler: "typ fehlt" }, { status: 400 });
  }

  const spalte = `automation_${typ}`;
  const { data: settings, error: settingsErr } = await supabase
    .from("settings")
    .select(spalte)
    .eq("key", "app")
    .maybeSingle();

  if (settingsErr) {
    return NextResponse.json({ fehler: settingsErr.message }, { status: 500 });
  }

  const aktiv = Boolean((settings as Record<string, unknown> | null)?.[spalte]);
  if (!aktiv) {
    return NextResponse.json({ skipped: true, grund: "inaktiv" });
  }

  if (typ === "krankmeldung") {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (!appUrl) {
      return NextResponse.json(
        { fehler: "NEXT_PUBLIC_APP_URL fehlt für Krankmeldung-Trigger." },
        { status: 500 }
      );
    }

    const res = await fetch(`${appUrl}/api/agents/emergency`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const ergebnis = await res.json().catch(() => ({}));
    return NextResponse.json({
      ausgefuehrt: true,
      status: res.status,
      ergebnis,
    });
  }

  if (typ === "neuer_einsatz") {
    const mitarbeiterPhone = String(payload.mitarbeiter_phone ?? "").replace(/\D/g, "");
    const einsatzTitel = String(payload.einsatz_titel ?? "Einsatz");
    const datum = String(payload.datum ?? "");
    const text = encodeURIComponent(`Neuer Einsatz: ${einsatzTitel} am ${datum}`);
    const whatsapp_url = mitarbeiterPhone
      ? `https://wa.me/${mitarbeiterPhone}?text=${text}`
      : null;

    return NextResponse.json({ ausgefuehrt: true, whatsapp_url });
  }

  return NextResponse.json({
    ausgefuehrt: false,
    grund: "Typ noch nicht implementiert",
  });
}
