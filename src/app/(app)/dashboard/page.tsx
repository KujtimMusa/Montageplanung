import { DashboardUebersicht } from "@/components/dashboard/DashboardUebersicht";
import { ladeDashboardDaten } from "@/lib/data/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardSeite() {
  const daten = await ladeDashboardDaten();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
          Dashboard
        </h1>
        <p className="text-sm text-zinc-400">
          KPIs und Trends auf einen Blick — Einsätze, Verfügbarkeit, Konflikte.
        </p>
      </div>
      <DashboardUebersicht daten={daten} />
    </div>
  );
}
