"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type ProfilKurz = {
  id: string;
  name: string;
  role: string;
} | null;

type Props = {
  profil: ProfilKurz;
};

/**
 * Oben unterhalb der Navigation: fehlendes Profil oder Rolle ohne Leitungsrechte.
 */
export function ProfilHinweisLeiste({ profil }: Props) {
  const router = useRouter();
  const [syncLaedt, setSyncLaedt] = useState(false);

  async function profilAnlegen() {
    setSyncLaedt(true);
    try {
      const res = await fetch("/api/profil/self-sync", { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        erstellt?: boolean;
        fehler?: string;
        nachricht?: string;
      };
      if (!res.ok) {
        toast.error(data.nachricht ?? data.fehler ?? "Konnte Profil nicht anlegen.");
        return;
      }
      if (data.erstellt) {
        toast.success("Mitarbeiterprofil wurde angelegt.");
      }
      router.refresh();
    } catch {
      toast.error("Anfrage fehlgeschlagen.");
    } finally {
      setSyncLaedt(false);
    }
  }

  if (!profil) {
    return (
      <div className="mb-4 flex flex-col gap-2 rounded-lg border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-100 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
          <span>
            Es ist kein Mitarbeiterprofil mit Ihrem Login verknüpft. Ohne
            Eintrag in „employees“ funktionieren Kalender und Teams nicht
            vollständig.
          </span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="shrink-0 border-amber-600/50 bg-amber-900/50 text-amber-50 hover:bg-amber-900/70"
          disabled={syncLaedt}
          onClick={() => void profilAnlegen()}
        >
          {syncLaedt ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Profil jetzt anlegen"
          )}
        </Button>
      </div>
    );
  }

  if (profil.role === "monteur") {
    return (
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 py-2.5 text-xs text-zinc-400">
        <Info className="mt-0.5 size-4 shrink-0 text-zinc-500" />
        <p>
          Sie sind als <strong className="text-zinc-300">Mitarbeiter</strong>{" "}
          ohne Leitungsrolle eingetragen — Kalender und eigene Einsätze sind
          sichtbar.{" "}
          <strong className="text-zinc-300">Teams, Stammdaten und Projekte</strong>{" "}
          dürfen nur mit Leitungsrolle bearbeitet werden. Bitte einen Admin
          bitten, unter{" "}
          <strong className="text-zinc-300">Teams → Mitarbeiter</strong> Ihre
          Rolle z. B. auf „Abteilungsleiter“ zu setzen.
        </p>
      </div>
    );
  }

  return null;
}
