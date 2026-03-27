"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  Clock,
  ExternalLink,
  Mail,
  MessageCircle,
  Phone,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { outlookKalenderLink } from "@/lib/utils/outlook";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  SPEZIALISIERUNGEN,
  STATUS_CONFIG,
  type Dienstleister,
} from "@/types/dienstleister";

type ZuweisungZeile = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string | null;
  projects: { title: string } | null;
  teams: { name: string } | null;
};

type Props = {
  offen: boolean;
  onOffenChange: (o: boolean) => void;
  d: Dienstleister | null;
  onBearbeiten: (d: Dienstleister) => void;
};

export function DienstleisterDetail({
  offen,
  onOffenChange,
  d,
  onBearbeiten,
}: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [zuweisungen, setZuweisungen] = useState<ZuweisungZeile[]>([]);
  const [lädtEinsätze, setLädtEinsätze] = useState(false);

  const ladenEinsätze = useCallback(async () => {
    if (!d?.id) {
      setZuweisungen([]);
      return;
    }
    setLädtEinsätze(true);
    try {
      const { data, error } = await supabase
        .from("assignments")
        .select("id,date,start_time,end_time,status,projects(title),teams(name)")
        .eq("dienstleister_id", d.id)
        .order("date", { ascending: false })
        .limit(10);
      if (error) throw error;
      const rows = (data ?? []) as unknown as Record<string, unknown>[];
      setZuweisungen(
        rows.map((row) => {
          const pr = row.projects as
            | { title?: string }
            | { title?: string }[]
            | null;
          const p = Array.isArray(pr) ? pr[0] : pr;
          const tm = row.teams as
            | { name?: string }
            | { name?: string }[]
            | null;
          const t = Array.isArray(tm) ? tm[0] : tm;
          return {
            id: row.id as string,
            date: row.date as string,
            start_time: row.start_time as string,
            end_time: row.end_time as string,
            status: (row.status as string | null) ?? null,
            projects: p?.title ? { title: p.title as string } : null,
            teams: t?.name ? { name: t.name as string } : null,
          };
        })
      );
    } catch {
      setZuweisungen([]);
    } finally {
      setLädtEinsätze(false);
    }
  }, [supabase, d?.id]);

  useEffect(() => {
    if (offen && d) void ladenEinsätze();
  }, [offen, d, ladenEinsätze]);

  if (!d) return null;

  const websiteHref = (() => {
    const w = d.website?.trim();
    if (!w) return null;
    if (/^https?:\/\//i.test(w)) return w;
    return `https://${w}`;
  })();

  return (
    <Sheet open={offen} onOpenChange={onOffenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col border-zinc-800 bg-zinc-950 sm:max-w-[560px]"
      >
        <SheetHeader className="border-b border-zinc-800 pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <SheetTitle className="text-xl text-zinc-50">{d.firma}</SheetTitle>
              {d.ansprechpartner ? (
                <p className="mt-0.5 text-sm text-zinc-400">{d.ansprechpartner}</p>
              ) : null}
            </div>
            <Badge
              className={`shrink-0 ${STATUS_CONFIG[d.status].farbe}`}
            >
              {STATUS_CONFIG[d.status].label}
            </Badge>
          </div>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-4">
          <div className="grid grid-cols-2 gap-3">
            {d.phone ? (
              <a href={`tel:${d.phone}`} className="group">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/5">
                  <div className="mb-1 flex items-center gap-2">
                    <Phone size={14} className="text-emerald-400" />
                    <span className="text-xs font-medium text-zinc-400">Telefon</span>
                  </div>
                  <p className="text-sm font-semibold text-zinc-200 group-hover:text-emerald-300">
                    {d.phone}
                  </p>
                </div>
              </a>
            ) : null}

            {d.whatsapp ? (
              <a
                href={`https://wa.me/${d.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
              >
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 transition-all hover:border-green-500/50 hover:bg-green-500/5">
                  <div className="mb-1 flex items-center gap-2">
                    <MessageCircle size={14} className="text-green-400" />
                    <span className="text-xs font-medium text-zinc-400">WhatsApp</span>
                  </div>
                  <p className="text-sm font-semibold text-zinc-200 group-hover:text-green-300">
                    {d.whatsapp}
                  </p>
                </div>
              </a>
            ) : null}

            {d.email ? (
              <a href={`mailto:${d.email}`} className="group">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 transition-all hover:border-blue-500/50 hover:bg-blue-500/5">
                  <div className="mb-1 flex items-center gap-2">
                    <Mail size={14} className="text-blue-400" />
                    <span className="text-xs font-medium text-zinc-400">E-Mail</span>
                  </div>
                  <p className="truncate text-sm font-semibold text-zinc-200 group-hover:text-blue-300">
                    {d.email}
                  </p>
                </div>
              </a>
            ) : null}

            {d.email ? (
              <a
                href={outlookKalenderLink(d)}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
              >
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 transition-all hover:border-indigo-500/50 hover:bg-indigo-500/5">
                  <div className="mb-1 flex items-center gap-2">
                    <CalendarPlus size={14} className="text-indigo-400" />
                    <span className="text-xs font-medium text-zinc-400">
                      Outlook-Termin
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-zinc-200 group-hover:text-indigo-300">
                    In {d.vorlauf_tage || 1} Tag(en) → anlegen
                  </p>
                </div>
              </a>
            ) : null}
          </div>

          {d.spezialisierung.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Spezialisierungen
              </p>
              <div className="flex flex-wrap gap-1">
                {d.spezialisierung.map((s) => (
                  <Badge
                    key={s}
                    variant="outline"
                    className="border-zinc-700 text-zinc-400"
                  >
                    {SPEZIALISIERUNGEN.find((x) => x.value === s)?.label ?? s}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {d.adresse?.trim() ? (
            <p className="text-sm text-zinc-400">
              <span className="text-zinc-500">Adresse: </span>
              {d.adresse}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
            <span className="flex items-center gap-1">
              <Clock size={14} className="text-zinc-500" />
              Vorlauf: {d.vorlauf_tage} Tage
            </span>
            {websiteHref ? (
              <a
                href={websiteHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-zinc-300 hover:text-zinc-100"
              >
                <ExternalLink size={14} />
                Website
              </a>
            ) : null}
          </div>

          {d.notizen?.trim() ? (
            <div>
              <p className="mb-1 text-xs font-medium text-zinc-500">Notizen</p>
              <p className="whitespace-pre-wrap text-sm text-zinc-300">{d.notizen}</p>
            </div>
          ) : null}

          <p className="text-xs text-zinc-600">
            Erstellt{" "}
            {format(parseISO(d.created_at), "dd.MM.yyyy", { locale: de })}
          </p>

          <Separator className="bg-zinc-800" />

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Einsätze
            </p>
            {lädtEinsätze ? (
              <p className="text-sm text-zinc-500">Laden…</p>
            ) : zuweisungen.length === 0 ? (
              <p className="text-sm text-zinc-500">Noch kein Einsatz geplant</p>
            ) : (
              <ul className="space-y-2">
                {zuweisungen.map((z) => (
                  <li
                    key={z.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs"
                  >
                    <p className="font-medium text-zinc-200">
                      {format(parseISO(z.date), "dd.MM.yyyy", { locale: de })}{" "}
                      <span className="tabular-nums text-zinc-200">
                        {z.start_time.slice(0, 5)} – {z.end_time.slice(0, 5)}
                      </span>
                    </p>
                    <p className="mt-0.5 text-zinc-400">
                      {z.projects?.title ?? "Projekt"}
                      {z.teams?.name ? (
                        <span className="text-zinc-500"> · {z.teams.name}</span>
                      ) : null}
                    </p>
                    {z.status ? (
                      <p className="mt-1 text-zinc-600">
                        Status: {z.status}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full border-zinc-700"
              onClick={() => {
                onOffenChange(false);
                router.push(`/planung?dienstleister=${d.id}`);
              }}
            >
              Einsatz planen
            </Button>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-4">
          <Button
            type="button"
            className="w-full"
            onClick={() => onBearbeiten(d)}
          >
            Bearbeiten
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
