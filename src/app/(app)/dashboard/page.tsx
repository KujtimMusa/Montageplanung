import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const dynamic = "force-dynamic";

function zeitZuMinutenDashboard(t: string): number {
  const [h, m, s] = t.split(":").map((x) => parseInt(x, 10));
  return (h ?? 0) * 60 + (m ?? 0) + (s ?? 0) / 60;
}

function einsaetzeUeberlappen(
  a: { start_time: string; end_time: string },
  b: { start_time: string; end_time: string }
): boolean {
  return (
    zeitZuMinutenDashboard(a.start_time) < zeitZuMinutenDashboard(b.end_time) &&
    zeitZuMinutenDashboard(a.end_time) > zeitZuMinutenDashboard(b.start_time)
  );
}

export default async function DashboardSeite() {
  const heute = new Date().toISOString().slice(0, 10);

  let einsaetzeHeute = 0;
  let abwesendHeute = 0;
  let wetterWarnungen = 0;
  let konfliktHinweis = "Keine automatische Sammelprüfung.";

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    try {
      const supabase = await createClient();

      const { count: ec } = await supabase
        .from("assignments")
        .select("id", { count: "exact", head: true })
        .eq("date", heute);
      einsaetzeHeute = ec ?? 0;

      const { data: abw } = await supabase
        .from("absences")
        .select("id")
        .lte("start_date", heute)
        .gte("end_date", heute);
      abwesendHeute = abw?.length ?? 0;

      const { count: wc } = await supabase
        .from("weather_alerts")
        .select("id", { count: "exact", head: true })
        .eq("acknowledged", false);
      wetterWarnungen = wc ?? 0;

      const { data: zu } = await supabase
        .from("assignments")
        .select("employee_id,date,start_time,end_time");

      if (zu && zu.length > 1) {
        const gruppen = new Map<string, typeof zu>();
        for (const z of zu) {
          const k = `${z.employee_id}|${z.date}`;
          if (!gruppen.has(k)) gruppen.set(k, []);
          gruppen.get(k)!.push(z);
        }
        let konflikte = 0;
        gruppen.forEach((liste) => {
          if (liste.length < 2) return;
          for (let i = 0; i < liste.length; i++) {
            for (let j = i + 1; j < liste.length; j++) {
              if (einsaetzeUeberlappen(liste[i]!, liste[j]!)) konflikte++;
            }
          }
        });
        konfliktHinweis =
          konflikte > 0
            ? `${konflikte} Überschneidungspaar(e) in den Daten — bitte Planung prüfen.`
            : "Keine zeitlichen Überschneidungen je Mitarbeiter/Tag gefunden.";
      }
    } catch {
      /* leere DB / RLS: Werte bleiben 0 */
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Schnellüberblick — funktioniert auch ohne Daten in der Datenbank.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Heutige Einsätze</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{einsaetzeHeute}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href="/planung"
              className="text-sm font-medium text-primary hover:underline"
            >
              Zur Planung
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Abwesend heute</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{abwesendHeute}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href="/abwesenheiten"
              className="text-sm font-medium text-primary hover:underline"
            >
              Abwesenheiten
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Aktive Wetterwarnungen</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{wetterWarnungen}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={wetterWarnungen > 0 ? "destructive" : "secondary"}>
              {wetterWarnungen > 0 ? "Prüfen" : "Keine"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Planungs-Konflikte</CardDescription>
            <CardTitle className="text-sm font-normal leading-snug text-muted-foreground">
              {konfliktHinweis}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href="/planung"
              className="text-sm font-medium text-primary hover:underline"
            >
              Kalender öffnen
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
