"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  Loader2,
  Plus,
  Search,
  X,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type KundeKombofeldEintrag = {
  id: string;
  company_name: string;
};

type Props = {
  value: string | null;
  onChange: (id: string | null) => void;
  kunden: KundeKombofeldEintrag[];
  onNeuAnlegen: (name: string) => Promise<{ id: string; company_name: string }>;
  disabled?: boolean;
};

export function KundeKombofeld({
  value,
  onChange,
  kunden,
  onNeuAnlegen,
  disabled,
}: Props) {
  const [offen, setOffen] = useState(false);
  const [suche, setSuche] = useState("");
  const [laedt, setLaedt] = useState(false);

  const gewaehlter = value
    ? kunden.find((k) => k.id === value)
    : undefined;
  const treffer = kunden.filter((k) =>
    k.company_name.toLowerCase().includes(suche.toLowerCase())
  );
  const zeigeNeuAnlegen =
    suche.trim().length > 1 &&
    !treffer.some(
      (k) => k.company_name.toLowerCase() === suche.toLowerCase().trim()
    );

  return (
    <Popover open={offen} onOpenChange={setOffen}>
      <PopoverTrigger
        nativeButton
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm",
          "transition-colors hover:border-zinc-700 focus:border-zinc-700 focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {gewaehlter ? (
            <>
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-zinc-700 text-xs font-bold text-zinc-400">
                {gewaehlter.company_name.slice(0, 2).toUpperCase()}
              </div>
              <span className="truncate text-zinc-100">
                {gewaehlter.company_name}
              </span>
            </>
          ) : (
            <span className="text-zinc-600">Kein Auftraggeber</span>
          )}
        </div>
        <ChevronDown size={14} className="shrink-0 text-zinc-500" />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-72 rounded-xl border border-zinc-800 bg-zinc-900 p-2 shadow-2xl"
      >
        <div className="relative mb-2">
          <Search
            size={12}
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-zinc-500"
          />
          <input
            autoFocus
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder="Kunden suchen…"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-1.5 pr-3 pl-7 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            onChange(null);
            setOffen(false);
          }}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
            !value ? "bg-zinc-800 text-zinc-300" : "text-zinc-500 hover:bg-zinc-800"
          )}
        >
          <X size={12} className="text-zinc-600" />
          Kein Auftraggeber
        </button>

        <div className="my-1 max-h-44 space-y-0.5 overflow-y-auto">
          {treffer.map((k) => (
            <button
              type="button"
              key={k.id}
              onClick={() => {
                onChange(k.id);
                setOffen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                value === k.id
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-300 hover:bg-zinc-800"
              )}
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-zinc-700 text-xs font-bold text-zinc-400">
                {k.company_name.slice(0, 2).toUpperCase()}
              </div>
              <span className="min-w-0 flex-1 truncate">{k.company_name}</span>
              {value === k.id ? (
                <Check size={12} className="shrink-0 text-zinc-400" />
              ) : null}
            </button>
          ))}

          {treffer.length === 0 && suche && !zeigeNeuAnlegen ? (
            <p className="px-2.5 py-3 text-center text-xs text-zinc-600">
              Kein Kunde gefunden
            </p>
          ) : null}
        </div>

        {zeigeNeuAnlegen ? (
          <div className="mt-1 border-t border-zinc-800 pt-1">
            <button
              type="button"
              onClick={() => {
                void (async () => {
                  setLaedt(true);
                  try {
                    const neuer = await onNeuAnlegen(suche.trim());
                    onChange(neuer.id);
                    setSuche("");
                    setOffen(false);
                  } catch {
                    /* Toast im Aufrufer */
                  } finally {
                    setLaedt(false);
                  }
                })();
              }}
              disabled={laedt}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-blue-400 transition-colors hover:bg-zinc-800 disabled:opacity-50"
            >
              {laedt ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Plus size={13} />
              )}
              „{suche.trim()}“ neu anlegen
            </button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
