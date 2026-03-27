"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  Clock,
  Edit2,
  HardHat,
  MapPin,
  MoreHorizontal,
  Users,
  Wrench,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { dbPrioritaetZuUi } from "@/lib/utils/priority";
import { PRIORITAET_FARBEN } from "@/lib/constants/planung-farben";
import type { EinsatzEvent } from "@/types/planung";

function hexWithAlpha(hex: string, alphaHex: string): string {
  const h = hex.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(h)) return `${h}${alphaHex}`;
  return "#3b82f615";
}

type EinsatzDetailPopoverProps = {
  einsatz: EinsatzEvent;
  position: { top: number; left: number };
  onClose: () => void;
  onBearbeiten: () => void;
  onDeleteMenu: () => void;
};

export function EinsatzDetailPopover({
  einsatz,
  position,
  onClose,
  onBearbeiten,
  onDeleteMenu,
}: EinsatzDetailPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({
    left: position.left,
    top: position.top,
  });

  const projektName =
    einsatz.projects?.title?.trim() ||
    einsatz.project_title?.trim() ||
    "Unbekanntes Projekt";

  const teamFarbe =
    einsatz.teams?.farbe?.trim() ||
    (einsatz.dienstleister?.company_name ? "#a855f7" : "#3b82f6");
  const projektFarbe =
    einsatz.projects?.farbe?.trim() ||
    PRIORITAET_FARBEN[einsatz.projects?.priority ?? "normal"] ||
    "#3b82f6";
  const farbe = projektFarbe || teamFarbe;

  const teamName = einsatz.teams?.name?.trim() || "—";
  const mitglieder = einsatz.teams?.mitglieder ?? [];
  const adresseAnzeige =
    einsatz.projects?.adresse?.trim() ||
    einsatz.ortLabel?.trim() ||
    null;

  const dienstleister = einsatz.dienstleister?.company_name?.trim() ?? null;

  const datum = format(new Date(einsatz.date), "d. MMMM yyyy", { locale: de });
  const priUi = dbPrioritaetZuUi(
    einsatz.prioritaet ?? einsatz.projects?.priority
  );

  const statusFarbe: { bg: string; text: string; label: string } =
    {
      niedrig: { bg: "#1c2a1e", text: "#86efac", label: "Niedrig" },
      mittel: { bg: "#166534", text: "#4ade80", label: "Geplant" },
      hoch: { bg: "#1e3a5f", text: "#60a5fa", label: "Aktiv" },
      kritisch: { bg: "#7f1d1d", text: "#f87171", label: "Kritisch" },
    }[priUi] ?? { bg: "#166534", text: "#4ade80", label: "Geplant" };

  useLayoutEffect(() => {
    const w = 280;
    const h = 420;
    let left = position.left;
    let top = position.top;
    if (typeof window !== "undefined") {
      left = Math.min(left, window.innerWidth - w - 8);
      top = Math.min(top, window.innerHeight - h - 8);
      left = Math.max(8, left);
      top = Math.max(8, top);
    }
    setCoords({ left, top });
  }, [position.left, position.top]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (ref.current?.contains(t)) return;
      if (
        t.closest('[data-slot="dropdown-menu-content"]') ||
        t.closest('[data-slot="dropdown-menu-portal"]') ||
        t.closest('[data-slot="dialog-content"]') ||
        t.closest('[data-slot="dialog-overlay"]')
      )
        return;
      onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const start = einsatz.start_time?.slice(0, 5) ?? "07:00";
  const end = einsatz.end_time?.slice(0, 5) ?? "16:00";

  return (
    <div
      ref={ref}
      className="fixed z-[9999] w-[280px] overflow-hidden rounded-[14px] border border-[#2a2a2e] bg-[#1c1c1e] text-[#e4e4e7] shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
      style={{ left: coords.left, top: coords.top }}
      role="dialog"
      aria-label="Einsatzdetails"
    >
      <div className="flex items-start justify-between gap-2 border-b border-[#2a2a2e] px-3.5 pb-2.5 pt-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: farbe }}
            aria-hidden
          />
          <span className="truncate text-sm font-semibold text-[#f4f4f5]">
            {projektName}
          </span>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            className="rounded-md p-1 text-[#71717a] hover:bg-[#27272a] hover:text-[#e4e4e7]"
            aria-label="Bearbeiten"
            onClick={() => {
              onBearbeiten();
              onClose();
            }}
          >
            <Edit2 size={13} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="rounded-md p-1 text-[#71717a] hover:bg-[#27272a] hover:text-[#e4e4e7]"
              aria-label="Weitere Aktionen"
            >
              <MoreHorizontal size={13} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[9rem]">
              <DropdownMenuItem
                className="text-red-400 focus:text-red-300"
                onSelect={() => {
                  onDeleteMenu();
                }}
              >
                Löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 px-3.5 py-2.5">
        <div className="flex items-center gap-2.5">
          <Activity size={13} className="shrink-0 text-[#52525b]" aria-hidden />
          <span className="w-[70px] shrink-0 text-xs text-[#71717a]">
            Status
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
            style={{
              color: statusFarbe.text,
              backgroundColor: `${statusFarbe.bg}66`,
              borderColor: `${statusFarbe.text}4d`,
            }}
          >
            <span
              className="inline-block size-[5px] rounded-full"
              style={{ background: statusFarbe.text }}
            />
            {statusFarbe.label}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Users size={13} className="shrink-0 text-[#52525b]" aria-hidden />
          <span className="w-[70px] shrink-0 text-xs text-[#71717a]">Team</span>
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className="flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
              style={{
                background: hexWithAlpha(teamFarbe, "30"),
                border: `1px solid ${teamFarbe}`,
                color: teamFarbe,
              }}
            >
              {teamName.slice(0, 2).toUpperCase()}
            </span>
            <span className="truncate text-xs font-medium text-[#e4e4e7]">
              {teamName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Calendar size={13} className="shrink-0 text-[#52525b]" aria-hidden />
          <span className="w-[70px] shrink-0 text-xs text-[#71717a]">
            Datum
          </span>
          <span className="text-xs text-[#e4e4e7]">
            {datum}
            <span className="text-[#71717a]"> · </span>
            <span className="tabular-nums text-[#a1a1aa]">1 Tag</span>
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Clock size={13} className="shrink-0 text-[#52525b]" aria-hidden />
          <span className="w-[70px] shrink-0 text-xs text-[#71717a]">Zeit</span>
          <span className="text-xs tabular-nums text-[#e4e4e7]">
            {start} – {end} Uhr
          </span>
        </div>

        {adresseAnzeige ? (
          <div className="flex items-start gap-2.5">
            <MapPin
              size={13}
              className="mt-0.5 shrink-0 text-[#52525b]"
              aria-hidden
            />
            <span className="w-[70px] shrink-0 text-xs text-[#71717a]">
              Adresse
            </span>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(adresseAnzeige)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-w-0 items-center gap-0.5 text-xs leading-snug text-[#60a5fa] hover:underline"
            >
              <span className="line-clamp-3">{adresseAnzeige}</span>
              <ArrowUpRight size={10} className="shrink-0" />
            </a>
          </div>
        ) : null}

        {mitglieder.length > 0 ? (
          <div className="flex items-start gap-2.5">
            <HardHat
              size={13}
              className="mt-0.5 shrink-0 text-[#52525b]"
              aria-hidden
            />
            <span className="w-[70px] shrink-0 text-xs text-[#71717a]">
              Monteure
            </span>
            <div className="flex min-w-0 flex-wrap gap-1">
              {mitglieder.slice(0, 3).map((m) => {
                const parts = m.name.trim().split(/\s+/);
                const vor = parts[0] ?? "";
                const nach = parts[1]?.charAt(0);
                const label = nach ? `${vor} ${nach}.` : vor;
                return (
                  <span
                    key={m.id}
                    className="rounded bg-[#27272a] px-1.5 py-px text-[11px] text-[#a1a1aa]"
                  >
                    {label}
                  </span>
                );
              })}
              {mitglieder.length > 3 ? (
                <span className="rounded bg-[#1f1f1f] px-1.5 py-px text-[11px] text-[#71717a]">
                  +{mitglieder.length - 3}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {dienstleister ? (
          <div className="flex items-center gap-2.5">
            <Wrench size={13} className="shrink-0 text-[#52525b]" aria-hidden />
            <span className="w-[70px] shrink-0 text-xs text-[#71717a]">
              Dienstl.
            </span>
            <span className="text-xs text-[#e4e4e7]">{dienstleister}</span>
          </div>
        ) : null}

        {einsatz.notes?.trim() ? (
          <div className="mt-1 rounded-lg bg-[#27272a] p-2 text-[11px] leading-relaxed text-[#a1a1aa]">
            {einsatz.notes.trim()}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[#2a2a2e] px-3.5 pb-3 pt-2.5">
        <div
          className="flex min-w-0 items-center gap-1.5 rounded-md border px-2 py-1"
          style={{
            background: hexWithAlpha(farbe, "15"),
            borderColor: `${farbe}4d`,
          }}
        >
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{ background: farbe }}
            aria-hidden
          />
          <span
            className="truncate text-[11px] font-medium"
            style={{ color: farbe }}
          >
            {projektName}
          </span>
        </div>
        {einsatz.hatKonflikt ? (
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-orange-400">
            <AlertTriangle size={12} aria-hidden />
            Konflikt
          </span>
        ) : null}
      </div>
    </div>
  );
}
