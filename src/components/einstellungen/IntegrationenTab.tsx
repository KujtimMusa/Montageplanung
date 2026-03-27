"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2Icon,
  MailIcon,
  MessageCircleIcon,
  RadioIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { useSettings } from "@/lib/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SecretInput } from "@/components/einstellungen/SecretInput";
import { toast } from "sonner";

export type EnvFlags = {
  gemini_api_key: boolean;
  twilio_account_sid: boolean;
  twilio_auth_token: boolean;
  twilio_from_number: boolean;
  resend_api_key: boolean;
  resend_from_email: boolean;
  teams_webhook_url: boolean;
};

const twilioSchema = z.object({
  twilio_account_sid: z.string(),
  twilio_auth_token: z.string(),
  twilio_from_number: z
    .string()
    .min(1, "From-Nummer erforderlich.")
    .regex(/^\+\d/, "Mit Ländervorwahl, z. B. +49…"),
});

const teamsSchema = z.object({
  teams_webhook_url: z.union([
    z.literal(""),
    z.string().url("Gültige URL eingeben."),
  ]),
});

const personioSchema = z.object({
  personio_api_key: z.string(),
  personio_subdomain: z.string().min(1, "Subdomain erforderlich."),
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

function formatPersonioSync(s: string | null): string {
  if (!s?.trim()) return "Noch nie";
  try {
    const d = parseISO(s);
    return `Zuletzt: ${format(d, "dd.MM.yyyy HH:mm", { locale: de })} Uhr`;
  } catch {
    return "Noch nie";
  }
}

async function postTest(provider: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch("/api/integrationen/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider }),
  });
  return (await res.json()) as { success: boolean; message: string };
}

type Props = { envFlags: EnvFlags };

export function IntegrationenTab({ envFlags }: Props) {
  const { getSetting, updateSetting } = useSettings();
  const [geladen, setGeladen] = useState(false);

  const [teamsEnabled, setTeamsEnabled] = useState(false);
  const [personioSyncText, setPersonioSyncText] = useState<string>("Noch nie");

  const twilioF = useForm<z.infer<typeof twilioSchema>>({
    resolver: zodResolver(twilioSchema),
    defaultValues: {
      twilio_account_sid: "",
      twilio_auth_token: "",
      twilio_from_number: "",
    },
  });

  const teamsF = useForm<z.infer<typeof teamsSchema>>({
    resolver: zodResolver(teamsSchema),
    defaultValues: { teams_webhook_url: "" },
  });

  const personioF = useForm<z.infer<typeof personioSchema>>({
    resolver: zodResolver(personioSchema),
    defaultValues: { personio_api_key: "", personio_subdomain: "" },
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
  const [sTeams, setSTeams] = useState(false);
  const [tTeams, setTTeams] = useState(false);
  const [sPersonio, setSPersonio] = useState(false);
  const [syncPersonio, setSyncPersonio] = useState(false);
  const [sResend, setSResend] = useState(false);
  const [tResend, setTResend] = useState(false);
  const [sGemini, setSGemini] = useState(false);
  const [tGemini, setTGemini] = useState(false);

  const laden = useCallback(async () => {
    const [
      sid,
      token,
      from,
      webhook,
      te,
      pKey,
      pSub,
      pSync,
      rKey,
      rFrom,
      gKey,
    ] = await Promise.all([
      getSetting("twilio_account_sid"),
      getSetting("twilio_auth_token"),
      getSetting("twilio_from_number"),
      getSetting("teams_webhook_url"),
      getSetting("teams_enabled"),
      getSetting("personio_api_key"),
      getSetting("personio_subdomain"),
      getSetting("personio_last_sync"),
      getSetting("resend_api_key"),
      getSetting("resend_from_email"),
      getSetting("gemini_api_key"),
    ]);

    twilioF.reset({
      twilio_account_sid: sid ?? "",
      twilio_auth_token: token ?? "",
      twilio_from_number: from ?? "",
    });
    teamsF.reset({ teams_webhook_url: webhook ?? "" });
    setTeamsEnabled(te === "true");
    personioF.reset({
      personio_api_key: pKey ?? "",
      personio_subdomain: pSub ?? "",
    });
    setPersonioSyncText(formatPersonioSync(pSync));
    resendF.reset({
      resend_api_key: rKey ?? "",
      resend_from_email: rFrom ?? "",
    });
    geminiF.reset({ gemini_api_key: gKey ?? "" });
    setGeladen(true);
  }, [getSetting, twilioF, teamsF, personioF, resendF, geminiF]);

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

  const teamsUrl = teamsF.watch("teams_webhook_url");
  const teamsVerbunden = Boolean(
    teamsUrl?.trim() || envFlags.teams_webhook_url
  );

  const personioKey = personioF.watch("personio_api_key");
  const personioVerbunden = Boolean(personioKey?.trim());

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

  async function speichernTeams(w: z.infer<typeof teamsSchema>) {
    setSTeams(true);
    try {
      await updateSetting("teams_webhook_url", w.teams_webhook_url.trim() || null);
      await updateSetting("teams_enabled", teamsEnabled ? "true" : "false");
      toast.success("Teams-Einstellungen gespeichert.");
      void laden();
    } finally {
      setSTeams(false);
    }
  }

  async function testTeams() {
    setTTeams(true);
    try {
      const r = await postTest("teams");
      if (r.success) toast.success("Verbindung erfolgreich ✓");
      else toast.error(`Test fehlgeschlagen: ${r.message}`);
    } finally {
      setTTeams(false);
    }
  }

  async function speichernPersonio(w: z.infer<typeof personioSchema>) {
    setSPersonio(true);
    try {
      await updateSetting("personio_api_key", w.personio_api_key.trim() || null);
      await updateSetting("personio_subdomain", w.personio_subdomain.trim() || null);
      toast.success("Personio-Einstellungen gespeichert.");
      void laden();
    } finally {
      setSPersonio(false);
    }
  }

  async function jetztSyncPersonio() {
    setSyncPersonio(true);
    try {
      const res = await fetch("/api/personio/sync", { method: "POST" });
      const j = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok) {
        toast.error(j.message ?? j.error ?? "Sync fehlgeschlagen.");
        return;
      }
      toast.success(j.message ?? "Synchronisation ausgeführt.");
      const neu = await getSetting("personio_last_sync");
      setPersonioSyncText(formatPersonioSync(neu));
    } finally {
      setSyncPersonio(false);
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
    <div className="grid gap-4 md:grid-cols-1 xl:grid-cols-2">
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader className="border-b border-zinc-800">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <MessageCircleIcon className="mt-0.5 size-5 text-emerald-400" />
              <div>
                <CardTitle className="text-zinc-50">WhatsApp / Twilio</CardTitle>
                <CardDescription className="text-zinc-500">
                  SMS/WhatsApp über Twilio
                </CardDescription>
              </div>
            </div>
            <Badge variant={twilioVerbunden ? "default" : "secondary"}>
              {twilioVerbunden ? "Verbunden" : "Nicht verbunden"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {(envFlags.twilio_account_sid ||
            envFlags.twilio_auth_token ||
            envFlags.twilio_from_number) && (
            <p className="rounded-md border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-200/90">
              Zugangsdaten können per Server-Umgebung (TWILIO_*) gesetzt sein — diese
              haben Vorrang vor der Datenbank.
            </p>
          )}
          <form onSubmit={twilioF.handleSubmit(speichernTwilio)} className="space-y-3">
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
                placeholder="+49…"
                className="border-zinc-700 bg-zinc-950"
                {...twilioF.register("twilio_from_number")}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={sTwilio}>
                {sTwilio && <Loader2Icon className="mr-2 size-4 animate-spin" />}
                Speichern
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={tTwilio}
                onClick={() => void testTwilio()}
              >
                {tTwilio && <Loader2Icon className="mr-2 size-4 animate-spin" />}
                Testen
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader className="border-b border-zinc-800">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <RadioIcon className="mt-0.5 size-5 text-sky-400" />
              <div>
                <CardTitle className="text-zinc-50">Microsoft Teams</CardTitle>
                <CardDescription className="text-zinc-500">
                  Incoming Webhook
                </CardDescription>
              </div>
            </div>
            <Badge variant={teamsVerbunden ? "default" : "secondary"}>
              {teamsVerbunden ? "Verbunden" : "Nicht verbunden"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {envFlags.teams_webhook_url && (
            <p className="rounded-md border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-200/90">
              Webhook-URL kann über TEAMS_WEBHOOK_URL in der Umgebung gesetzt sein.
            </p>
          )}
          <form onSubmit={teamsF.handleSubmit(speichernTeams)} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Webhook-URL</Label>
              <Input
                type="url"
                placeholder="https://…"
                className="border-zinc-700 bg-zinc-950"
                {...teamsF.register("teams_webhook_url")}
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2">
              <Label htmlFor="teams-enabled" className="cursor-pointer text-sm">
                Benachrichtigungen aktiv
              </Label>
              <Switch
                id="teams-enabled"
                checked={teamsEnabled}
                onCheckedChange={(c) => setTeamsEnabled(Boolean(c))}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={sTeams}>
                {sTeams && <Loader2Icon className="mr-2 size-4 animate-spin" />}
                Speichern
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={tTeams}
                onClick={() => void testTeams()}
              >
                {tTeams && <Loader2Icon className="mr-2 size-4 animate-spin" />}
                Testen
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader className="border-b border-zinc-800">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <UsersIcon className="mt-0.5 size-5 text-violet-400" />
              <div>
                <CardTitle className="text-zinc-50">Personio</CardTitle>
                <CardDescription className="text-zinc-500">
                  Abwesenheiten / HR-Sync
                </CardDescription>
              </div>
            </div>
            <Badge variant={personioVerbunden ? "default" : "secondary"}>
              {personioVerbunden ? "Verbunden" : "Nicht verbunden"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <form onSubmit={personioF.handleSubmit(speichernPersonio)} className="space-y-3">
            <div className="space-y-1.5">
              <Label>API-Key</Label>
              <SecretInput
                className="w-full"
                inputClassName="border-zinc-700 bg-zinc-950"
                {...personioF.register("personio_api_key")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Subdomain</Label>
              <Input
                placeholder="firma"
                className="border-zinc-700 bg-zinc-950"
                {...personioF.register("personio_subdomain")}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={sPersonio}>
                {sPersonio && <Loader2Icon className="mr-2 size-4 animate-spin" />}
                Speichern
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={syncPersonio}
                onClick={() => void jetztSyncPersonio()}
              >
                {syncPersonio && <Loader2Icon className="mr-2 size-4 animate-spin" />}
                Jetzt synchronisieren
              </Button>
            </div>
          </form>
          <p className="text-xs text-zinc-500">{personioSyncText}</p>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader className="border-b border-zinc-800">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <MailIcon className="mt-0.5 size-5 text-amber-400" />
              <div>
                <CardTitle className="text-zinc-50">E-Mail / Resend</CardTitle>
                <CardDescription className="text-zinc-500">
                  Transaktions-E-Mails
                </CardDescription>
              </div>
            </div>
            <Badge variant={resendVerbunden ? "default" : "secondary"}>
              {resendVerbunden ? "Verbunden" : "Nicht verbunden"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {(envFlags.resend_api_key || envFlags.resend_from_email) && (
            <p className="rounded-md border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-200/90">
              Resend kann über RESEND_API_KEY / RESEND_FROM_EMAIL in der Umgebung
              konfiguriert sein (Vorrang vor DB).
            </p>
          )}
          <form onSubmit={resendF.handleSubmit(speichernResend)} className="space-y-3">
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
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={sResend}>
                {sResend && <Loader2Icon className="mr-2 size-4 animate-spin" />}
                Speichern
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={tResend}
                onClick={() => void testResend()}
              >
                {tResend && <Loader2Icon className="mr-2 size-4 animate-spin" />}
                Testen
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900 xl:col-span-2">
        <CardHeader className="border-b border-zinc-800">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <SparklesIcon className="mt-0.5 size-5 text-fuchsia-400" />
              <div>
                <CardTitle className="text-zinc-50">Gemini AI</CardTitle>
                <CardDescription className="text-zinc-500">
                  Wird für KI-Assistent und Agenten verwendet
                </CardDescription>
              </div>
            </div>
            <Badge variant={geminiVerbunden ? "default" : "secondary"}>
              {geminiVerbunden ? "Verbunden" : "Nicht verbunden"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {envFlags.gemini_api_key && (
            <p className="rounded-md border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-200/90">
              API-Key ist in der Server-Umgebung gesetzt (GEMINI_API_KEY) — hat Vorrang
              vor dem Eintrag in der Datenbank.
            </p>
          )}
          <form onSubmit={geminiF.handleSubmit(speichernGemini)} className="space-y-3">
            <div className="space-y-1.5">
              <Label>API-Key</Label>
              <SecretInput
                className="w-full"
                inputClassName="border-zinc-700 bg-zinc-950"
                {...geminiF.register("gemini_api_key")}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={sGemini}>
                {sGemini && <Loader2Icon className="mr-2 size-4 animate-spin" />}
                Speichern
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={tGemini}
                onClick={() => void testGemini()}
              >
                {tGemini && <Loader2Icon className="mr-2 size-4 animate-spin" />}
                Testen
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
