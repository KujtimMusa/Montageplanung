import { ProjekteVerwaltung } from "@/components/projekte/ProjekteVerwaltung";

export default function ProjekteSeite() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Projekte</h1>
        <p className="text-muted-foreground">
          Aufträge mit Status, Priorität, Zeitraum und Abteilungen verwalten.
        </p>
      </div>
      <ProjekteVerwaltung />
    </div>
  );
}
