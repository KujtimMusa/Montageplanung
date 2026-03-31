export default function DatenschutzPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-12 text-zinc-300">
      <h1 className="text-2xl font-bold text-zinc-100">Datenschutzerklärung</h1>
      <p className="text-sm text-zinc-500">Stand: {new Date().toLocaleDateString("de-DE")}</p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-200">Verantwortlicher</h2>
        <p className="text-sm text-zinc-400">
          [Dein Name]
          <br />
          [Adresse]
          <br />
          [E-Mail]
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-200">Verarbeitete Daten</h2>
        <p className="text-sm text-zinc-400">
          Wir verarbeiten folgende personenbezogene Daten: Namen, E-Mail-Adressen,
          Telefonnummern, Arbeitszeiten und Abwesenheitsdaten von Mitarbeitern der nutzenden
          Unternehmen. Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO
          (Vertragserfüllung) sowie Art. 6 Abs. 1 lit. f DSGVO (berechtigte Interessen).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-200">Auftragsverarbeitung</h2>
        <p className="text-sm text-zinc-400">
          Wir setzen folgende Auftragsverarbeiter ein: Supabase Inc. (Datenbankhosting, USA/EU),
          Vercel Inc. (Hosting, USA/EU), Google LLC (Gemini AI, USA). Mit allen Dienstleistern
          bestehen Auftragsverarbeitungsverträge (AVV).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-200">Ihre Rechte</h2>
        <p className="text-sm text-zinc-400">
          Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der
          Verarbeitung sowie das Recht auf Datenübertragbarkeit. Kontakt: [deine-email@domain.de]
        </p>
      </section>
    </div>
  );
}
