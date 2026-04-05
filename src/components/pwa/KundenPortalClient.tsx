"use client";

import { useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG } from "@/lib/projekt-status";
import { normalisiereStatus } from "@/types/projekte";

type EinsatzZeile = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  vorname_mitarbeiter: string;
  mitarbeiter_name: string | null;
  team_name: string | null;
  partner_name: string | null;
  kurzbeschreibung: string;
  zeitraum_label: string;
};

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
  einsaetze: EinsatzZeile[];
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

const POLL_MS = 15_000;

export function KundenPortalClient({ token }: { token: string }) {
  const [info, setInfo] = useState<ProjektInfo | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [aktualisiert, setAktualisiert] = useState(false);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [sende, setSende] = useState(false);

  const laden = useCallback(async () => {
    try {
      const u = new URL("/api/pwa/projekt-info", window.location.origin);
      u.searchParams.set("token", token);
      u.searchParams.set("_", String(Date.now()));
      const r = await fetch(u.toString(), {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      const j = (await r.json()) as ProjektInfo & { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Fehler");
      setInfo({
        orgName: j.orgName,
        orgLogoUrl: j.orgLogoUrl,
        project: j.project,
        einsaetze: (j.einsaetze ?? []) as EinsatzZeile[],
        fortschrittsFotos: j.fortschrittsFotos ?? [],
      });
    } catch {
      setInfo(null);
    }
  }, [token]);

  const ladenNachrichten = useCallback(async () => {
    const u = new URL("/api/pwa/customer-messages", window.location.origin);
    u.searchParams.set("token", token);
    u.searchParams.set("_", String(Date.now()));
    const r = await fetch(u.toString(), {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    });
    const j = (await r.json()) as { messages?: Msg[] };
    setMessages(j.messages ?? []);
  }, [token]);

  const refreshAlles = useCallback(async () => {
    setAktualisiert(true);
    try {
      await Promise.all([laden(), ladenNachrichten()]);
    } finally {
      setAktualisiert(false);
    }
  }, [laden, ladenNachrichten]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLaedt(true);
      await Promise.all([laden(), ladenNachrichten()]);
      if (!cancelled) setLaedt(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [laden, ladenNachrichten]);

  useEffect(() => {
    const t = setInterval(() => {
      void laden();
      void ladenNachrichten();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [laden, ladenNachrichten]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        void refreshAlles();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refreshAlles]);

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
  const heuteStr = format(new Date(), "yyyy-MM-dd");
  const sortEins = [...info.einsaetze].sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return a.start_time.localeCompare(b.start_time);
  });
  const kommende = sortEins.filter((e) => e.date >= heuteStr);
  const vergangene = sortEins.filter((e) => e.date < heuteStr);
  const naechster = kommende[0];
  const vergangenMitStatus = vergangene.filter(
    (e) => e.status?.toLowerCase() === "abgeschlossen"
  );

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <header className="mb-6 border-b border-slate-800 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-[#01696f]">{info.orgName}</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-50">
              {info.project.title}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => void refreshAlles()}
            disabled={aktualisiert}
            className="shrink-0 rounded-lg border border-slate-700 p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            title="Aktualisieren"
            aria-label="Aktualisieren"
          >
            <RefreshCw
              className={cn("size-4", aktualisiert && "animate-spin")}
            />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium"
            style={{ borderColor: stCfg.dot, color: stCfg.dot }}
          >
            <span className="size-1.5 rounded-full" style={{ background: stCfg.dot }} />
            {stCfg.label}
          </span>
          <span className="text-[10px] text-slate-600">
            Termine alle {Math.round(POLL_MS / 1000)}s
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
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Wann & wer
        </h2>
        {naechster ? (
          <div className="mb-4 rounded-xl border border-[#01696f]/40 bg-[#01696f]/10 p-4">
            <p className="text-xs font-medium text-[#01696f]">Nächster Termin</p>
            <p className="mt-1 font-semibold text-slate-100">
              {format(parseISO(naechster.date), "EEEE, dd. MMMM yyyy", { locale: de })}
            </p>
            <p className="mt-1 text-sm text-slate-300">{naechster.zeitraum_label}</p>
            <p className="mt-2 text-sm leading-snug text-slate-200">
              {naechster.kurzbeschreibung}
            </p>
          </div>
        ) : (
          <p className="mb-4 text-sm text-slate-500">Noch keine Termine geplant.</p>
        )}

        {kommende.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
              Alle kommenden Termine ({kommende.length})
            </p>
            <ul className="space-y-2">
              {kommende.map((e) => (
                <li
                  key={e.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2.5"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-slate-200">
                      {format(parseISO(e.date), "dd.MM.yyyy", { locale: de })}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {e.zeitraum_label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{e.kurzbeschreibung}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Fortschritt
        </h2>
        {vergangenMitStatus.length > 0 ? (
          <ul className="space-y-2">
            {vergangenMitStatus.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-2 text-sm text-slate-400"
              >
                <span className="text-emerald-500">✓</span>
                {format(parseISO(e.date), "dd.MM.yyyy", { locale: de })} —{" "}
                {e.kurzbeschreibung}
              </li>
            ))}
          </ul>
        ) : vergangene.length > 0 ? (
          <ul className="space-y-2">
            {vergangene.map((e) => (
              <li key={e.id} className="text-sm text-slate-500">
                {format(parseISO(e.date), "dd.MM.yyyy", { locale: de })} ·{" "}
                {e.kurzbeschreibung}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">Noch keine vergangenen Einsätze.</p>
        )}
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
