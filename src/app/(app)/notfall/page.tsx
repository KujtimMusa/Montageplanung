import { NotfallModus } from "@/components/notfall/NotfallModus";

export default function NotfallSeite() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notfall</h1>
        <p className="text-muted-foreground">
          Kurzfristiger Ausfall — Einsätze und Ersatz aus derselben Abteilung.
        </p>
      </div>
      <NotfallModus />
    </div>
  );
}
