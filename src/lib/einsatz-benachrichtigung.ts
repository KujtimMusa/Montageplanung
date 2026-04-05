import * as webpush from "web-push";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { templateEinsatzNeu } from "@/lib/email-templates";

export interface EinsatzBenachrichtigungParams {
  assignmentId: string;
  organizationId: string;
  employeeId?: string | null;
  projectId?: string | null;
  projectTitle?: string | null;
  datum: string;
  startzeit?: string | null;
  endzeit?: string | null;
  notes?: string | null;
  /** Wenn true: kein Resend (Dialog hat bereits E-Mail+ICS); nur In-App + Push. */
  nurNotification?: boolean;
}

async function ladeResendUndBetrieb(
  supabase: ReturnType<typeof createServiceRoleClient>,
  organizationId: string
): Promise<{ apiKey: string; fromEmail: string; betriebName?: string }> {
  const { data: rows } = await supabase
    .from("settings")
    .select("key,value")
    .eq("organization_id", organizationId)
    .in("key", ["resend_api_key", "resend_from_email"]);

  const map = Object.fromEntries(
    (rows ?? []).map((r) => [r.key as string, r.value ?? ""])
  );
  let apiKey =
    String(map.resend_api_key ?? "").trim() ||
    process.env.RESEND_API_KEY?.trim() ||
    "";
  let fromEmail =
    String(map.resend_from_email ?? "").trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "";

  if (!apiKey || !fromEmail) {
    const { data: fallback } = await supabase
      .from("settings")
      .select("key,value")
      .in("key", ["resend_api_key", "resend_from_email"])
      .is("organization_id", null);
    const fb = Object.fromEntries(
      (fallback ?? []).map((r) => [r.key as string, r.value ?? ""])
    );
    apiKey = apiKey || String(fb.resend_api_key ?? "").trim();
    fromEmail = fromEmail || String(fb.resend_from_email ?? "").trim();
  }

  const { data: appRow } = await supabase
    .from("settings")
    .select("betrieb_name")
    .eq("organization_id", organizationId)
    .eq("key", "app")
    .maybeSingle();

  const betriebName = (appRow as { betrieb_name?: string } | null)?.betrieb_name;

  return { apiKey, fromEmail, betriebName };
}

/**
 * Sendet Web-Push an alle Subscriptions des Mitarbeiters.
 * @returns true, wenn mindestens eine Nachricht erfolgreich war; sonst false (kein VAPID, keine Subs, alle fehlgeschlagen).
 */
async function sendePushFuerEinsatz(opts: {
  employeeId: string;
  title: string;
  body: string;
  url?: string;
}): Promise<boolean> {
  const vapidSubject = process.env.VAPID_SUBJECT?.trim();
  const publicKey =
    process.env.VAPID_PUBLIC_KEY?.trim() ??
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  /** Nur Server-Env (nie NEXT_PUBLIC_*): Private Key darf nicht im Client-Bundle landen. */
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();

  console.log("[Push] VAPID gesetzt:", !!privateKey, {
    subject: !!vapidSubject,
    publicKey: !!publicKey,
  });

  if (!vapidSubject || !publicKey || !privateKey) {
    console.warn(
      "[Push] Abbruch: VAPID_SUBJECT / VAPID_PUBLIC_KEY (oder NEXT_PUBLIC_VAPID_PUBLIC_KEY) / VAPID_PRIVATE_KEY fehlen auf dem Server (z. B. Vercel → Environment Variables)."
    );
    return false;
  }

  const mailto = vapidSubject.startsWith("mailto:")
    ? vapidSubject
    : `mailto:${vapidSubject}`;
  webpush.setVapidDetails(mailto, publicKey, privateKey);

  const supabase = createServiceRoleClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("employee_id", opts.employeeId);

  const hatSubs = Boolean(subs?.length);
  console.log("[Push] Subscriptions gefunden:", hatSubs, subs?.length ?? 0);
  if (subs?.length) {
    const first = subs[0] as { endpoint?: string };
    console.log("[Push] Versand an (erstes Endpoint):", first?.endpoint?.slice(0, 50));
  }

  if (!subs?.length) return false;

  const payload = JSON.stringify({
    title: opts.title,
    body: opts.body,
    url: opts.url ?? "/",
    icon: "/icons/icon-192.png",
  });

  const ergebnisse = await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint as string,
            keys: {
              p256dh: sub.p256dh as string,
              auth: sub.auth as string,
            },
          },
          payload,
          { TTL: 3600 }
        );
        return true;
      } catch (err: unknown) {
        const status =
          err instanceof webpush.WebPushError
            ? err.statusCode
            : (err as { statusCode?: number }).statusCode;
        if (status === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint as string);
        }
        return false;
      }
    })
  );

  return ergebnisse.some(Boolean);
}

/**
 * Zentrale Benachrichtigung nach neuem Einsatz:
 * Push zuerst (wenn Subscription), sonst E-Mail — außer `nurNotification` blockiert E-Mail (Dialog hat bereits gesendet).
 * Immer In-App-Notification.
 */
export async function sendeEinsatzBenachrichtigung(
  params: EinsatzBenachrichtigungParams
): Promise<void> {
  const supabase = createServiceRoleClient();

  if (!params.employeeId) return;

  const { data: employee } = await supabase
    .from("employees")
    .select("id, name, email, pwa_token, push_status")
    .eq("id", params.employeeId)
    .maybeSingle();

  if (!employee) return;
  const emp = employee;

  const { data: pushSub } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("employee_id", params.employeeId)
    .limit(1)
    .maybeSingle();

  const pushStatus = String(emp.push_status ?? "unknown");
  const hasSub = !!pushSub;

  let projektName = params.projectTitle ?? "Einsatz";
  let adresse: string | undefined;

  if (params.projectId) {
    const { data: projekt } = await supabase
      .from("projects")
      .select("title, adresse")
      .eq("id", params.projectId)
      .maybeSingle();
    if (projekt) {
      projektName = (projekt.title as string) ?? projektName;
      adresse = (projekt.adresse as string | null) ?? undefined;
    }
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const pwaTok = emp.pwa_token as string | null | undefined;
  const pwaLink =
    baseUrl && pwaTok ? `${baseUrl}/m/${pwaTok}/projekte` : undefined;

  const startZeit = (params.startzeit ?? "07:00:00").slice(0, 5);
  const endZeit = (params.endzeit ?? "16:00:00").slice(0, 5);

  const datumFormatiert = new Date(`${params.datum}T12:00:00`).toLocaleDateString(
    "de-DE",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  async function sendeEinsatzEmailResend(): Promise<void> {
    const { apiKey, fromEmail, betriebName } = await ladeResendUndBetrieb(
      supabase,
      params.organizationId
    );

    const { subject, html } = templateEinsatzNeu({
      mitarbeiter_name: (emp.name as string) ?? "Mitarbeiter",
      projekt: projektName,
      datum: datumFormatiert,
      start: startZeit,
      ende: endZeit,
      adresse,
      anmerkung: params.notes ?? undefined,
      betrieb_name: betriebName,
      pwa_link: pwaLink,
    });

    if (!apiKey || !fromEmail || !emp.email) return;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [emp.email as string],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      console.warn("[einsatz-benachrichtigung] Resend:", await res.text());
    }
  }

  const msgParts: string[] = [datumFormatiert];
  if (params.startzeit) msgParts.push(`um ${startZeit}`);
  if (adresse) msgParts.push(`· ${adresse}`);
  const message = msgParts.join(" ");

  async function emailFallback(): Promise<void> {
    if (!params.nurNotification && emp.email) {
      await sendeEinsatzEmailResend();
    }
  }

  if (pushStatus === "denied" || pushStatus === "unsupported") {
    await emailFallback();
  } else if (pushStatus === "granted" && !hasSub) {
    await supabase
      .from("employees")
      .update({ push_status: "unknown" })
      .eq("id", params.employeeId);
    await emailFallback();
  } else if (hasSub && (pushStatus === "granted" || pushStatus === "unknown")) {
    try {
      const pushOk = await sendePushFuerEinsatz({
        employeeId: params.employeeId,
        title: `Neuer Einsatz: ${projektName}`,
        body: message,
        url: pwaLink,
      });
      if (!pushOk) throw new Error("push_failed");
    } catch (e) {
      console.warn("[einsatz-benachrichtigung] Push:", e);
      if (pushStatus === "granted") {
        await supabase
          .from("employees")
          .update({ push_status: "unknown" })
          .eq("id", params.employeeId);
      }
      await emailFallback();
    }
  } else {
    await emailFallback();
  }

  const { error: nErr } = await supabase.from("notifications").insert({
    employee_id: params.employeeId,
    organization_id: params.organizationId,
    type: "einsatz_neu",
    title: `Neuer Einsatz: ${projektName}`,
    message,
    priority: "normal",
    read: false,
    action_url: pwaLink ?? null,
  });

  if (nErr) {
    console.warn("[einsatz-benachrichtigung] notifications:", nErr.message);
  }
}
