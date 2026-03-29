import { format } from "date-fns";
import { de } from "date-fns/locale";
import { DashboardRealtime } from "@/components/dashboard/DashboardRealtime";
import { DashboardUebersicht } from "@/components/dashboard/DashboardUebersicht";
import { ladeDashboardDaten } from "@/lib/data/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardSeite() {
  const daten = await ladeDashboardDaten();
  const jetzt = new Date();

  return (
    <DashboardRealtime>
      <div className="space-y-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
          <div className="text-right">
            <p className="text-sm font-semibold text-zinc-300">
              {format(jetzt, "EEEE, dd. MMMM yyyy", { locale: de })}
            </p>
            <p className="mt-0.5 text-xs text-zinc-600">
              Letzte Aktualisierung: {format(jetzt, "HH:mm")} Uhr
            </p>
          </div>
        </div>
        <DashboardUebersicht daten={daten} />
      </div>
    </DashboardRealtime>
  );
}
