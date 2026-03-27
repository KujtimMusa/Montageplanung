import { ladeDashboardDaten } from "@/lib/data/dashboard";
import { DashboardUebersicht } from "@/components/dashboard/DashboardUebersicht";

export const dynamic = "force-dynamic";

export default async function DashboardSeite() {
  const daten = await ladeDashboardDaten();
  return <DashboardUebersicht daten={daten} />;
}
