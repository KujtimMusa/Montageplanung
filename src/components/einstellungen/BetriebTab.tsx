"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Building2,
  Calendar,
  Clock,
  Mail,
  Phone,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const APP_KEY = "app";

const BUNDESLAENDER = [
  { value: "BW", label: "Baden-Wuerttemberg" },
  { value: "BY", label: "Bayern" },
  { value: "BE", label: "Berlin" },
  { value: "BB", label: "Brandenburg" },
  { value: "HB", label: "Bremen" },
  { value: "HH", label: "Hamburg" },
  { value: "HE", label: "Hessen" },
  { value: "MV", label: "Mecklenburg-Vorpommern" },
  { value: "NI", label: "Niedersachsen" },
  { value: "NW", label: "Nordrhein-Westfalen" },
  { value: "RP", label: "Rheinland-Pfalz" },
  { value: "SL", label: "Saarland" },
  { value: "SN", label: "Sachsen" },
  { value: "ST", label: "Sachsen-Anhalt" },
  { value: "SH", label: "Schleswig-Holstein" },
  { value: "TH", label: "Thueringen" },
] as const;

type BetriebDaten = {
  betrieb_name: string;
  betrieb_strasse: string;
  betrieb_plz: string;
  betrieb_ort: string;
  betrieb_telefon: string;
  betrieb_email: string;
  arbeitszeit_start: string;
  arbeitszeit_ende: string;
  urlaubstage_pro_jahr: number;
  schichtmodell: string;
  feiertag_bundesland: string;
};

export function BetriebTab() {
  const supabase = createClient();
  const [speichern, setSpeichern] = useState(false);
  const [daten, setDaten] = useState<BetriebDaten>({
    betrieb_name: "",
    betrieb_strasse: "",
    betrieb_plz: "",
    betrieb_ort: "",
    betrieb_telefon: "",
    betrieb_email: "",
    arbeitszeit_start: "07:00",
    arbeitszeit_ende: "17:00",
    urlaubstage_pro_jahr: 25,
    schichtmodell: "standard",
    feiertag_bundesland: "NW",
  });

  useEffect(() => {
    async function laden() {
      const { data } = await supabase
        .from("settings")
        .select(
          "betrieb_name,betrieb_strasse,betrieb_plz,betrieb_ort,betrieb_telefon,betrieb_email,arbeitszeit_start,arbeitszeit_ende,urlaubstage_pro_jahr,schichtmodell,feiertag_bundesland"
        )
        .eq("key", APP_KEY)
        .maybeSingle();
      if (data) {
        setDaten((d) => ({
          ...d,
          ...((data as Partial<BetriebDaten>) ?? {}),
          urlaubstage_pro_jahr: Number(
            (data as Partial<BetriebDaten>)?.urlaubstage_pro_jahr ?? d.urlaubstage_pro_jahr
          ),
        }));
      }
    }
    void laden();
  }, [supabase]);

  async function handleSpeichern() {
    setSpeichern(true);
    const { error } = await supabase
      .from("settings")
      .upsert(
        {
          key: APP_KEY,
          value: "config",
          ...daten,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
    setSpeichern(false);
    if (error) toast.error("Fehler beim Speichern");
    else toast.success("Betriebsdaten gespeichert");
  }

  return (
    <div className="space-y-4">
      <Sektion icon={<Building2 size={14} />} titel="Firmendaten">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Feld label="Firmenname">
              <Input
                value={daten.betrieb_name}
                onChange={(v) => setDaten((d) => ({ ...d, betrieb_name: v }))}
                placeholder="Mustermann GmbH & Co. KG"
              />
            </Feld>
          </div>
          <Feld label="Strasse & Hausnummer">
            <Input
              value={daten.betrieb_strasse}
              onChange={(v) => setDaten((d) => ({ ...d, betrieb_strasse: v }))}
              placeholder="Musterstrasse 1"
            />
          </Feld>
          <div className="grid grid-cols-3 gap-2">
            <Feld label="PLZ">
              <Input
                value={daten.betrieb_plz}
                onChange={(v) => setDaten((d) => ({ ...d, betrieb_plz: v }))}
                placeholder="44137"
              />
            </Feld>
            <div className="col-span-2">
              <Feld label="Ort">
                <Input
                  value={daten.betrieb_ort}
                  onChange={(v) => setDaten((d) => ({ ...d, betrieb_ort: v }))}
                  placeholder="Dortmund"
                />
              </Feld>
            </div>
          </div>
          <Feld label="Telefon" icon={<Phone size={12} />}>
            <Input
              value={daten.betrieb_telefon}
              onChange={(v) => setDaten((d) => ({ ...d, betrieb_telefon: v }))}
              placeholder="+49 231 ..."
            />
          </Feld>
          <Feld label="E-Mail" icon={<Mail size={12} />}>
            <Input
              value={daten.betrieb_email}
              onChange={(v) => setDaten((d) => ({ ...d, betrieb_email: v }))}
              placeholder="info@firma.de"
            />
          </Feld>
        </div>
      </Sektion>

      <Sektion icon={<Clock size={14} />} titel="Arbeitszeiten & Schichtmodell">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Feld label="Arbeitsbeginn (Standard)">
            <input
              type="time"
              value={daten.arbeitszeit_start}
              onChange={(e) =>
                setDaten((d) => ({ ...d, arbeitszeit_start: e.target.value }))
              }
              className="w-full rounded-xl border border-zinc-700/40 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500/40 focus:outline-none focus:ring-1 focus:ring-violet-500/20"
            />
          </Feld>
          <Feld label="Arbeitsende (Standard)">
            <input
              type="time"
              value={daten.arbeitszeit_ende}
              onChange={(e) =>
                setDaten((d) => ({ ...d, arbeitszeit_ende: e.target.value }))
              }
              className="w-full rounded-xl border border-zinc-700/40 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500/40 focus:outline-none focus:ring-1 focus:ring-violet-500/20"
            />
          </Feld>
          <Feld label="Schichtmodell">
            <select
              value={daten.schichtmodell}
              onChange={(e) => setDaten((d) => ({ ...d, schichtmodell: e.target.value }))}
              className="w-full rounded-xl border border-zinc-700/40 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500/40 focus:outline-none"
            >
              <option value="standard">Standard (Mo-Fr)</option>
              <option value="5_tage">5-Tage-Woche</option>
              <option value="6_tage">6-Tage-Woche</option>
              <option value="schicht">Schichtbetrieb</option>
            </select>
          </Feld>
          <Feld label="Urlaubstage / Jahr">
            <input
              type="number"
              min={0}
              max={40}
              value={daten.urlaubstage_pro_jahr}
              onChange={(e) =>
                setDaten((d) => ({
                  ...d,
                  urlaubstage_pro_jahr: Number.parseInt(e.target.value || "0", 10),
                }))
              }
              className="w-full rounded-xl border border-zinc-700/40 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500/40 focus:outline-none focus:ring-1 focus:ring-violet-500/20"
            />
          </Feld>
        </div>
      </Sektion>

      <Sektion icon={<Calendar size={14} />} titel="Feiertage">
        <Feld label="Bundesland (fuer Feiertagsberechnung)">
          <select
            value={daten.feiertag_bundesland}
            onChange={(e) =>
              setDaten((d) => ({ ...d, feiertag_bundesland: e.target.value }))
            }
            className="w-full rounded-xl border border-zinc-700/40 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500/40 focus:outline-none"
          >
            {BUNDESLAENDER.map((bl) => (
              <option key={bl.value} value={bl.value}>
                {bl.label}
              </option>
            ))}
          </select>
        </Feld>
        <p className="mt-2 text-[11px] text-zinc-600">
          Wird fuer automatische Feiertagserkennung in der Einsatzplanung verwendet.
        </p>
      </Sektion>

      <button
        onClick={() => void handleSpeichern()}
        disabled={speichern}
        className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-violet-500 disabled:opacity-50"
      >
        <Save size={14} />
        {speichern ? "Wird gespeichert..." : "Speichern"}
      </button>
    </div>
  );
}

function Sektion({
  icon,
  titel,
  children,
}: {
  icon: ReactNode;
  titel: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900">
      <div className="flex items-center gap-2.5 border-b border-zinc-800/60 px-5 py-4">
        <div className="text-zinc-500">{icon}</div>
        <p className="text-sm font-semibold tracking-tight text-zinc-200">{titel}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Feld({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-zinc-600">{icon}</span>}
        <label className="text-xs font-medium text-zinc-400">{label}</label>
      </div>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-zinc-700/40 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 transition-all focus:border-violet-500/40 focus:outline-none focus:ring-1 focus:ring-violet-500/20"
    />
  );
}
