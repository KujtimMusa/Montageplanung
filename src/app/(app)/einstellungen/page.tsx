import { Suspense } from "react";
import { EinstellungenInhalt } from "@/components/einstellungen/EinstellungenInhalt";

export default function EinstellungenSeite() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
          Einstellungen
        </h1>
        <p className="text-sm text-zinc-400">
          Kurzanleitung, Kunden, Abteilungen, Abwesenheiten und Integrationen.
        </p>
      </div>
      <Suspense
        fallback={
          <p className="text-sm text-zinc-500">Einstellungen werden geladen…</p>
        }
      >
        <EinstellungenInhalt />
      </Suspense>
    </div>
  );
}
