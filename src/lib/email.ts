import { createClient } from "@/lib/supabase/server";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  icsAnhang?: {
    inhalt: string;
    methode: "REQUEST" | "CANCEL" | "UPDATE";
  };
}

export async function sendEmail(
  opts: SendEmailOptions
): Promise<{ ok: boolean; fehler?: string }> {
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("settings")
    .select("key,value")
    .in("key", ["resend_api_key", "resend_from_email"]);

  const apiKey =
    process.env.RESEND_API_KEY?.trim() ??
    ((settings ?? []).find((s) => s.key === "resend_api_key")?.value as
      | string
      | undefined);
  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() ??
    ((settings ?? []).find((s) => s.key === "resend_from_email")?.value as
      | string
      | undefined);

  if (!apiKey || !fromEmail) {
    console.warn("[email] Resend nicht konfiguriert");
    return { ok: false, fehler: "Resend nicht konfiguriert" };
  }

  try {
    const body: Record<string, unknown> = {
      from: fromEmail,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
    };

    if (opts.icsAnhang) {
      body.attachments = [
        {
          filename: "einsatz.ics",
          content: Buffer.from(opts.icsAnhang.inhalt).toString("base64"),
          type: "text/calendar",
          headers: {
            "Content-Type": `text/calendar; method=${opts.icsAnhang.methode}; charset=UTF-8`,
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
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, fehler: err };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, fehler: String(e) };
  }
}
