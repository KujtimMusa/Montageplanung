import { AbwesenheitenVerwaltung } from "@/components/abwesenheiten/AbwesenheitenVerwaltung";

export default function AbwesenheitenSeite() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Abwesenheiten</h1>
        <p className="text-muted-foreground">
          Manuell bis Personio live ist — Typen für den Kalender-Hintergrund.
        </p>
      </div>
      <AbwesenheitenVerwaltung />
    </div>
  );
}
