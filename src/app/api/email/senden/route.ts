import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function loadSettingsMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  keys: string[]
): Promise<Record<string, string | null>> {
  const { data } = await supabase.from("settings").select("key,value").in("key", keys);
  return Object.fromEntries((data ?? []).map((r) => [r.key as string, r.value ?? null]));
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, enabled: false, reason: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  let body: {
    an?: string;
    betreff?: string;
    body?: string;
    to?: string;
    subject?: string;
    text?: string;
    html?: string;
    icsAnhang?: { inhalt: string; methode: "REQUEST" | "CANCEL" | "UPDATE" };
    partner_id?: string;
    assignment_id?: string;
    template_typ?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, enabled: false, reason: "INVALID_JSON" },
      { status: 400 }
    );
  }

  const to = (body.to ?? body.an ?? "").trim();
  const subject = (body.subject ?? body.betreff ?? "").trim();
  const mailBody = body.body ?? body.text ?? "";
  const htmlBody = body.html;
  const partnerId = body.partner_id?.trim() ?? null;
  const assignmentId = body.assignment_id?.trim() ?? null;
  const templateTyp = body.template_typ?.trim() ?? "allgemein";

  const istLegacyDienstleister = Boolean(partnerId);
  if (!to || !subject || (!mailBody && !htmlBody) || (istLegacyDienstleister && !partnerId)) {
    return NextResponse.json(
      { ok: false, enabled: false, reason: "MISSING_FIELDS" },
      { status: 400 }
    );
  }

  // Echte Versendung nutzt DB-Settings oder Umgebungsvariablen.
  const s = await loadSettingsMap(supabase, ["resend_api_key", "resend_from_email"]);
  const apiKey = s.resend_api_key?.trim() ?? process.env.RESEND_API_KEY?.trim() ?? "";
  const from = s.resend_from_email?.trim() ?? process.env.RESEND_FROM_EMAIL?.trim() ?? "";

  if (!apiKey || !from) {
    return NextResponse.json(
      {
        ok: false,
        enabled: false,
        reason: "NO_RESEND_CONFIG",
        todo: "RESEND_API_KEY/RESEND_FROM_EMAIL setzen und echte Versendung aktivieren.",
      },
      { status: 503 }
    );
  }

  const resendBody: Record<string, unknown> = {
    from,
    to: [to],
    subject,
    ...(htmlBody ? { html: htmlBody } : { text: mailBody ?? "" }),
  };
  if (body.icsAnhang?.inhalt && body.icsAnhang?.methode) {
    resendBody.attachments = [
      {
        filename: "einsatz.ics",
        content: Buffer.from(body.icsAnhang.inhalt).toString("base64"),
        type: "text/calendar",
        headers: {
          "Content-Type": `text/calendar; method=${body.icsAnhang.methode}; charset=UTF-8`,
        },
      },
    ];
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(resendBody),
  });

  const json = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) {
    return NextResponse.json(
      {
        ok: false,
        enabled: true,
        reason: "RESEND_SEND_FAILED",
        message: json.message ?? `HTTP ${res.status}`,
      },
      { status: 500 }
    );
  }

  // Persistiere Versand-Timestamps & Status (nur wenn assignment_id vorhanden)
  if (assignmentId && partnerId) {
    const now = new Date().toISOString();
    const nextStatus =
      templateTyp === "bestaetigung"
        ? "bestaetigt"
        : templateTyp === "absage"
          ? "abgelehnt"
          : templateTyp === "einsatz_anfrage"
            ? "angefragt"
            : "angefragt";

    const payload: Record<string, unknown> = {
      status: nextStatus,
      email_gesendet_at: now,
    };
    if (templateTyp === "bestaetigung") payload.bestaetigt_at = now;

    const { error: updErr } = await supabase
      .from("assignment_subcontractors")
      .update(payload)
      .eq("assignment_id", assignmentId)
      .eq("subcontractor_id", partnerId);

    // Nicht blockieren
    if (updErr) {
      console.warn("[email/senden] Pivot update fehlgeschlagen:", updErr.message);
    }
  }

  return NextResponse.json({ ok: true, enabled: true });
}

