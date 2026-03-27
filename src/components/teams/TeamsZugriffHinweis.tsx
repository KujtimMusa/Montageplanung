import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Grund = "kein_profil" | "monteur";

export function TeamsZugriffHinweis({ grund }: { grund: Grund }) {
  return (
    <Card className="border-amber-800/60 bg-amber-950/20">
      <CardHeader>
        <CardTitle className="text-lg text-amber-100">
          {grund === "kein_profil"
            ? "Kein Mitarbeiterprofil gefunden"
            : "Kein Zugriff auf Stammdaten"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-zinc-300">
        {grund === "kein_profil" ? (
          <>
            <p>
              Ihr Login ist nicht mit einem Eintrag in der Tabelle{" "}
              <strong className="text-zinc-100">employees</strong> verknüpft
              (Feld <code className="rounded bg-zinc-800 px-1">auth_user_id</code>
              ). Ohne dieses Profil kann die App Ihre Rolle nicht erkennen.
            </p>
            <p>
              Auf dem <strong className="text-zinc-100">Dashboard</strong> (gelber
              Balken oben) gibt es den Button{" "}
              <strong className="text-zinc-100">Profil jetzt anlegen</strong>, falls
              der Server <code className="rounded bg-zinc-800 px-1">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
              gesetzt hat. Sonst: Admin in Supabase oder Registrierungs-Trigger prüfen.
            </p>
          </>
        ) : (
          <>
            <p>
              Die Rolle <strong className="text-zinc-100">„monteur“</strong> ist
              für die reine Einsicht in eigene Termine gedacht — Teams, Mitarbeiter
              und Projekte dürfen nur Führungskräfte bearbeiten.
            </p>
            <p>
              Wenn Sie eine Leitungsfunktion haben, muss Ihre Rolle in{" "}
              <strong className="text-zinc-100">employees.role</strong> angepasst
              werden (z. B. abteilungsleiter, teamleiter).
            </p>
          </>
        )}
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/dashboard"
            className="text-blue-400 underline-offset-2 hover:underline"
          >
            Zum Dashboard
          </Link>
          <Link
            href="/planung"
            className="text-blue-400 underline-offset-2 hover:underline"
          >
            Zur Planung
          </Link>
          <Link
            href="/einstellungen"
            className="text-blue-400 underline-offset-2 hover:underline"
          >
            Einstellungen
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
