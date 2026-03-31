"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2Icon,
  MailIcon,
  MessageCircleIcon,
  SparklesIcon,
} from "lucide-react";
import { useSettings } from "@/lib/hooks/useSettings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SecretInput } from "@/components/einstellungen/SecretInput";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type EnvFlags = {
  gemini_api_key: boolean;
  twilio_account_sid: boolean;
  twilio_auth_token: boolean;
  twilio_from_number: boolean;
  resend_api_key: boolean;
  resend_from_email: boolean;
};

const twilioSchema = z.object({
  twilio_account_sid: z.string(),
  twilio_auth_token: z.string(),
  twilio_from_number: z
    .string()
    .min(1, "From-Nummer erforderlich.")
    .regex(/^\+\d/, "Mit Ländervorwahl, z. B. +49…"),
});

const resendSchema = z.object({
  resend_api_key: z.string(),
  resend_from_email: z.union([
    z.literal(""),
    z.string().email("Gültige E-Mail."),
  ]),
});

const geminiSchema = z.object({
  gemini_api_key: z.string(),
});

async function postTest(provider: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch("/api/integrationen/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider }),
  });
  return (await res.json()) as { success: boolean; message: string };
}

type Props = { envFlags: EnvFlags };

function IntegrationKarte({
  icon,
  titel,
  beschreibung,
  verbunden,
  kinder,
  onTest,
  onSpeichern,
  testLaed,
  speichernLaed,
  hatFelder,
  badge,
}: {
  icon: ReactNode;
  titel: string;
  beschreibung: string;
  verbunden: boolean;
  kinder: ReactNode;
  onTest?: () => void;
  onSpeichern: () => void;
  testLaed?: boolean;
  speichernLaed?: boolean;
  hatFelder: boolean;
  badge?: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-800/60 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-700/60 bg-zinc-800 text-zinc-400">
            {icon}
          </div>
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              {titel}
              {badge ? (
                <span className="rounded-full border border-amber-900/40 bg-amber-950/30 px-2 py-0.5 text-[10px] font-medium text-amber-500">
                  {badge}
                </span>
              ) : null}
            </p>
            <p className="text-xs text-zinc-500">{beschreibung}</p>
          </div>
        </div>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
            verbunden
              ? "border-emerald-900/40 bg-emerald-950/30 text-emerald-400"
              : "border-zinc-700/40 bg-zinc-800/60 text-zinc-500"
          )}
        >
          <div
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              verbunden ? "bg-emerald-400" : "bg-zinc-600"
            )}
          />
          {verbunden ? "Verbunden" : "Nicht verbunden"}
        </span>
      </div>

      <div className="space-y-3 p-5">
        {kinder}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onSpeichern}
            disabled={speichernLaed}
            className="rounded-xl border border-zinc-700/40 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition-all hover:bg-zinc-700 hover:text-zinc-100 disabled:opacity-40"
          >
            {speichernLaed ? "Speichern..." : "Speichern"}
          </button>
          {onTest && hatFelder && (
            <button
              onClick={onTest}
              disabled={testLaed}
              className="rounded-xl border border-zinc-700/40 bg-zinc-800/60 px-3 py-2 text-xs font-medium text-zinc-400 transition-all hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-40"
            >
              {testLaed ? "Teste..." : "Verbindung testen"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function IntegrationenTab({ envFlags }: Props) {
  const { getSetting, updateSetting } = useSettings();
  const [geladen, setGeladen] = useState(false);

  const twilioF = useForm<z.infer<typeof twilioSchema>>({
    resolver: zodResolver(twilioSchema),
    defaultValues: {
      twilio_account_sid: "",
      twilio_auth_token: "",
      twilio_from_number: "",
    },
  });

  const resendF = useForm<z.infer<typeof resendSchema>>({
    resolver: zodResolver(resendSchema),
    defaultValues: { resend_api_key: "", resend_from_email: "" },
  });

  const geminiF = useForm<z.infer<typeof geminiSchema>>({
    resolver: zodResolver(geminiSchema),
    defaultValues: { gemini_api_key: "" },
  });

  const [sTwilio, setSTwilio] = useState(false);
  const [tTwilio, setTTwilio] = useState(false);
  const [sResend, setSResend] = useState(false);
  const [tResend, setTResend] = useState(false);
  const [sGemini, setSGemini] = useState(false);
  const [tGemini, setTGemini] = useState(false);

  const laden = useCallback(async () => {
    const [
      sid,
      token,
      from,
      rKey,
      rFrom,
      gKey,
    ] = await Promise.all([
      getSetting("twilio_account_sid"),
      getSetting("twilio_auth_token"),
      getSetting("twilio_from_number"),
      getSetting("resend_api_key"),
      getSetting("resend_from_email"),
      getSetting("gemini_api_key"),
    ]);

    twilioF.reset({
      twilio_account_sid: sid ?? "",
      twilio_auth_token: token ?? "",
      twilio_from_number: from ?? "",
    });
    resendF.reset({
      resend_api_key: rKey ?? "",
      resend_from_email: rFrom ?? "",
    });
    geminiF.reset({ gemini_api_key: gKey ?? "" });
    setGeladen(true);
  }, [getSetting, twilioF, resendF, geminiF]);

  useEffect(() => {
    void laden();
  }, [laden]);

  const tw = twilioF.watch();
  const twilioVerbunden = Boolean(
    (tw.twilio_account_sid.trim() &&
      tw.twilio_auth_token.trim() &&
      tw.twilio_from_number.trim()) ||
      (envFlags.twilio_account_sid &&
        envFlags.twilio_auth_token &&
        envFlags.twilio_from_number)
  );

  const resend = resendF.watch();
  const resendVerbunden = Boolean(
    resend.resend_api_key?.trim() || envFlags.resend_api_key
  );

  const geminiKey = geminiF.watch("gemini_api_key");
  const geminiVerbunden = Boolean(
    geminiKey?.trim() || envFlags.gemini_api_key
  );

  async function speichernTwilio(w: z.infer<typeof twilioSchema>) {
    setSTwilio(true);
    try {
      await updateSetting("twilio_account_sid", w.twilio_account_sid.trim() || null);
      await updateSetting("twilio_auth_token", w.twilio_auth_token.trim() || null);
      await updateSetting("twilio_from_number", w.twilio_from_number.trim() || null);
      toast.success("Twilio-Einstellungen gespeichert.");
      void laden();
    } finally {
      setSTwilio(false);
    }
  }

  async function testTwilio() {
    setTTwilio(true);
    try {
      const r = await postTest("twilio");
      if (r.success) toast.success("Verbindung erfolgreich ✓");
      else toast.error(`Test fehlgeschlagen: ${r.message}`);
    } finally {
      setTTwilio(false);
    }
  }

  async function speichernResend(w: z.infer<typeof resendSchema>) {
    setSResend(true);
    try {
      await updateSetting("resend_api_key", w.resend_api_key.trim() || null);
      await updateSetting("resend_from_email", w.resend_from_email.trim() || null);
      toast.success("Resend-Einstellungen gespeichert.");
      void laden();
    } finally {
      setSResend(false);
    }
  }

  async function testResend() {
    setTResend(true);
    try {
      const r = await postTest("resend");
      if (r.success) toast.success("Verbindung erfolgreich ✓");
      else toast.error(`Test fehlgeschlagen: ${r.message}`);
    } finally {
      setTResend(false);
    }
  }

  async function speichernGemini(w: z.infer<typeof geminiSchema>) {
    setSGemini(true);
    try {
      await updateSetting("gemini_api_key", w.gemini_api_key.trim() || null);
      toast.success("Gemini-Einstellungen gespeichert.");
      void laden();
    } finally {
      setSGemini(false);
    }
  }

  async function testGemini() {
    setTGemini(true);
    try {
      const r = await postTest("gemini");
      if (r.success) toast.success("Verbindung erfolgreich ✓");
      else toast.error(`Test fehlgeschlagen: ${r.message}`);
    } finally {
      setTGemini(false);
    }
  }

  if (!geladen) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Loader2Icon className="size-4 animate-spin" />
        Integrationen werden geladen…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <IntegrationKarte
        icon={<MessageCircleIcon size={14} />}
        titel="WhatsApp / Twilio"
        beschreibung="SMS/WhatsApp ueber Twilio"
        verbunden={twilioVerbunden}
        onSpeichern={() => void twilioF.handleSubmit(speichernTwilio)()}
        onTest={() => void testTwilio()}
        testLaed={tTwilio}
        speichernLaed={sTwilio}
        hatFelder={Boolean(
          twilioF.watch("twilio_account_sid") &&
            twilioF.watch("twilio_auth_token") &&
            twilioF.watch("twilio_from_number")
        )}
        kinder={
          <>
          {(envFlags.twilio_account_sid ||
            envFlags.twilio_auth_token ||
            envFlags.twilio_from_number) && (
            <p className="rounded-md border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-200/90">
              Zugangsdaten können per Server-Umgebung (TWILIO_*) gesetzt sein — diese
              haben Vorrang vor der Datenbank.
            </p>
          )}
          <div className="space-y-1.5">
            <Label>Account SID</Label>
            <Input
              className="border-zinc-700 bg-zinc-950"
              {...twilioF.register("twilio_account_sid")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Auth Token</Label>
            <SecretInput
              className="w-full"
              inputClassName="border-zinc-700 bg-zinc-950"
              {...twilioF.register("twilio_auth_token")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>From-Nummer</Label>
            <Input
              placeholder="+49..."
              className="border-zinc-700 bg-zinc-950"
              {...twilioF.register("twilio_from_number")}
            />
          </div>
          </>
        }
      />

      <IntegrationKarte
        icon={<MailIcon size={14} />}
        titel="E-Mail / Resend"
        beschreibung="Transaktions-E-Mails"
        verbunden={resendVerbunden}
        onSpeichern={() => void resendF.handleSubmit(speichernResend)()}
        onTest={() => void testResend()}
        testLaed={tResend}
        speichernLaed={sResend}
        hatFelder={Boolean(resendF.watch("resend_api_key"))}
        kinder={
          <>
          {(envFlags.resend_api_key || envFlags.resend_from_email) && (
            <p className="rounded-md border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-200/90">
              Resend kann ueber RESEND_API_KEY / RESEND_FROM_EMAIL in der Umgebung
              konfiguriert sein (Vorrang vor DB).
            </p>
          )}
          <div className="space-y-1.5">
            <Label>API-Key</Label>
            <SecretInput
              className="w-full"
              inputClassName="border-zinc-700 bg-zinc-950"
              {...resendF.register("resend_api_key")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Absender-E-Mail</Label>
            <Input
              type="email"
              className="border-zinc-700 bg-zinc-950"
              {...resendF.register("resend_from_email")}
            />
          </div>
          </>
        }
      />

      <IntegrationKarte
        icon={<SparklesIcon size={14} />}
        titel="Gemini AI"
        beschreibung="Wird fuer KI-Assistent und Agenten verwendet"
        verbunden={geminiVerbunden}
        onSpeichern={() => void geminiF.handleSubmit(speichernGemini)()}
        onTest={() => void testGemini()}
        testLaed={tGemini}
        speichernLaed={sGemini}
        hatFelder={Boolean(geminiF.watch("gemini_api_key"))}
        kinder={
          <>
          {envFlags.gemini_api_key && (
            <p className="rounded-md border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-200/90">
              API-Key ist in der Server-Umgebung gesetzt (GEMINI_API_KEY) - hat Vorrang
              vor dem Eintrag in der Datenbank.
            </p>
          )}
          <div className="space-y-1.5">
            <Label>API-Key</Label>
            <SecretInput
              className="w-full"
              inputClassName="border-zinc-700 bg-zinc-950"
              {...geminiF.register("gemini_api_key")}
            />
          </div>
          </>
        }
      />

    </div>
  );
}
