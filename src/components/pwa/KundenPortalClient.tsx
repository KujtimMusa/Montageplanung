"use client";

import { useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG } from "@/lib/projekt-status";
import { normalisiereStatus } from "@/types/projekte";

type ProjektInfo = {
  orgName: string | null;
  orgLogoUrl: string | null;
  project: {
    title: string;
    description: string | null;
    status: string;
    planned_start: string | null;
    planned_end: string | null;
    adresse: string | null;
  };
  einsaetze: Array<{
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    status: string;
    vorname_mitarbeiter: string;
  }>;
  fortschrittsFotos: Array<{
    id: string;
    file_url: string | null;
    type: string;
    created_at: string;
  }>;
};

type Msg = {
  id: string;
  author_type: string;
  author_name: string | null;
  content: string;
  created_at: string;
};

export function KundenPortalClient({ token }: { token: string }) {
  const [info, setInfo] = useState<ProjektInfo | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [sende, setSende] = useState(false);

  const laden = useCallback(async () => {
    try {
      const u = new URL("/api/pwa/projekt-info", window.location.origin);
      u.searchParams.set("token", token);
      const r = await fetch(u.toString());
      const j = (await r.json()) as ProjektInfo & { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Fehler");
      setInfo({
        orgName: j.orgName,
        orgLogoUrl: j.orgLogoUrl,
        project: j.project,
        einsaetze: j.einsaetze ?? [],
        fortschrittsFotos: j.fortschrittsFotos ?? [],
      });
    } catch {
      setInfo(null);
    }
  }, [token]);

  const ladenNachrichten = useCallback(async () => {
    const u = new URL("/api/pwa/customer-messages", window.location.origin);
    u.searchParams.set("token", token);
    const r = await fetch(u.toString());
    const j = (await r.json()) as { messages?: Msg[] };
    setMessages(j.messages ?? []);
  }, [token]);

  useEffect(() => {
    void (async () => {
      setLaedt(true);
      await Promise.all([laden(), ladenNachrichten()]);
      setLaedt(false);
    })();
  }, [laden, ladenNachrichten]);

  useEffect(() => {
    const t = setInterval(() => {
      void ladenNachrichten();
    }, 30_000);
    return () => clearInterval(t);
  }, [ladenNachrichten]);

  async function senden() {
    const c = text.trim();
    if (!c) return;
    setSende(true);
    try {
      const r = await fetch("/api/pwa/customer-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          content: c,
          author_name: name.trim() || undefined,
        }),
      });
      if (r.ok) {
        setText("");
        void ladenNachrichten();
      }
    } finally {
      setSende(false);
    }
  }

  if (laedt || !info) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-slate-500" />
      </div>
    );
  }

  const st = normalisiereStatus(info.project.status);
  const stCfg = STATUS_CONFIG[st] ?? { label: info.project.status, dot: "#71717a" };
  const vornamen = Array.from(
    new Set(info.einsaetze.map((e) => e.vorname_mitarbeiter).filter(Boolean))
  );
  const sortEins = [...info.einsaetze].sort((a, b) => a.date.localeCompare(b.date));
  const naechster = sortEins.find((e) => e.date >= format(new Date(), "yyyy-MM-dd")) ?? sortEins[0];
  const vergangen = sortEins.filter((e) => e.status?.toLowerCase() === "abgeschlossen");

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <header className="mb-6 border-b border-slate-800 pb-4">
        <p className="text-sm font-medium text-[#01696f]">{info.orgName}</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-50">{info.project.title}</h1>
        <div className="mt-2 flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium"
            style={{ borderColor: stCfg.dot, color: stCfg.dot }}
          >
            <span className="size-1.5 rounded-full" style={{ background: stCfg.dot }} />
            {stCfg.label}
          </span>
        </div>
      </header>

      {info.project.adresse ? (
        <div className="mb-6 flex items-start gap-2 text-sm text-slate-400">
          <MapPin className="mt-0.5 size-4 shrink-0 text-slate-600" />
          <span>{info.project.adresse}</span>
        </div>
      ) : null}

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Wann & wer
        </h2>
        {naechster ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs text-slate-500">Nächster Einsatz</p>
            <p className="font-medium text-slate-100">
              {format(parseISO(naechster.date), "EEEE, dd. MMMM yyyy", { locale: de })}{" "}
              · {naechster.start_time.slice(0, 5)} Uhr
            </p>
            {vornamen.length > 0 ? (
              <p className="mt-2 text-sm text-slate-400">
                Team: {vornamen.join(", ")}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Keine Termine hinterlegt.</p>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Fortschritt
        </h2>
        <ul className="space-y-2">
          {vergangen.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-2 text-sm text-slate-400"
            >
              <span className="text-emerald-500">✓</span>
              {format(parseISO(e.date), "dd.MM.yyyy", { locale: de })} — Abgeschlossen
            </li>
          ))}
        </ul>
      </section>

      {info.fortschrittsFotos.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Fotos
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {info.fortschrittsFotos.map((f) => (
              <a
                key={f.id}
                href={f.file_url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="relative aspect-square overflow-hidden rounded-lg border border-slate-800 bg-slate-900"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.file_url ?? ""} alt="" className="size-full object-cover" />
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mb-10">
        <h2 className="mb-2 text-sm font-semibold text-slate-200">
          Nachricht an {info.orgName ?? "uns"} senden
        </h2>
        <Input
          placeholder="Ihr Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-2 bg-slate-900 text-base text-slate-100"
        />
        <Textarea
          placeholder="Ihre Nachricht…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[80px] bg-slate-900 text-base text-slate-100"
        />
        <Button
          type="button"
          className="mt-2 w-full bg-[#01696f] hover:bg-[#015a5f]"
          disabled={sende || !text.trim()}
          onClick={() => void senden()}
        >
          {sende ? <Loader2 className="size-4 animate-spin" /> : "Senden"}
        </Button>

        <div className="mt-6 space-y-3">
          {messages.map((m) => {
            const eigen = m.author_type === "kunde";
            return (
              <div
                key={m.id}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                  eigen
                    ? "ml-auto bg-[#01696f]/30 text-slate-100"
                    : "mr-auto border border-slate-700 bg-slate-900 text-slate-300"
                )}
              >
                <p>{m.content}</p>
                <p className="mt-1 text-[10px] text-slate-500">
                  {new Date(m.created_at).toLocaleString("de-DE")}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-slate-800 pt-4 text-center text-xs text-slate-600">
        Powered by {info.orgName ?? "Ihr Betrieb"}
      </footer>
    </div>
  );
}
