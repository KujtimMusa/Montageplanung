import { createClient } from "@/lib/supabase/server";

type AutoTyp =
  | "krankmeldung"
  | "neuer_einsatz"
  | "projekt_ueberfaellig"
  | "dienstleister_absage";

export async function triggerAutomatisierung(
  typ: AutoTyp,
  payload: Record<string, unknown>
) {
  const supabase = await createClient();

  const spalte = `automation_${typ}`;
  const { data } = await supabase
    .from("settings")
    .select(spalte)
    .eq("key", "app")
    .maybeSingle();

  const aktiv = Boolean((data as Record<string, unknown> | null)?.[spalte]);
  if (!aktiv) return;

  if (typ === "krankmeldung") {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (appUrl) {
      await fetch(`${appUrl}/api/agents/emergency`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
  }

  if (typ === "neuer_einsatz") {
    const mitarbeiterPhone = String(payload.mitarbeiter_phone ?? "").replace(/\D/g, "");
    const einsatzTitel = String(payload.einsatz_titel ?? "Einsatz");
    const datum = String(payload.datum ?? "");
    const text = encodeURIComponent(
      `Neuer Einsatz für dich: ${einsatzTitel} am ${datum}`
    );
    const link = mitarbeiterPhone
      ? `https://wa.me/${mitarbeiterPhone}?text=${text}`
      : "";
    await supabase.from("agent_log").insert({
      agent_type: "automation_neuer_einsatz",
      trigger_event: "assignment_created",
      success: Boolean(link),
      payload: JSON.stringify({ ...payload, whatsapp_url: link }),
    } as Record<string, unknown>);
  }

  await supabase.from("agent_log").insert({
    agent_type: `automation_${typ}`,
    trigger_event: "automation_triggered",
    success: true,
    payload: JSON.stringify(payload),
  } as Record<string, unknown>);
}
