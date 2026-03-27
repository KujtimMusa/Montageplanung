import { DashboardRealtime } from "@/components/dashboard/DashboardRealtime";
import { DashboardUebersicht } from "@/components/dashboard/DashboardUebersicht";
import { ladeDashboardDaten } from "@/lib/data/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardSeite() {
  const daten = await ladeDashboardDaten();

  return (
    <DashboardRealtime>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            KPIs und Trends auf einen Blick
          </p>
        </div>
        <DashboardUebersicht daten={daten} />
      </div>
    </DashboardRealtime>
  );
}
