import { KundenListe } from "@/components/kunden/KundenListe";

export default function KundenSeite() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kunden</h1>
        <p className="text-muted-foreground">
          Einfache Stammdaten — Auswahl bei Projekten.
        </p>
      </div>
      <KundenListe />
    </div>
  );
}
