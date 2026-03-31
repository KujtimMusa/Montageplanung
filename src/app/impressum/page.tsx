export default function ImpressumPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-6 py-12 text-zinc-300">
      <h1 className="text-2xl font-bold text-zinc-100">Impressum</h1>
      <p className="text-sm text-zinc-400">
        Angaben gemäß § 5 TMG
        <br />
        <br />
        [Dein Name / Firmenname]
        <br />
        [Straße + Hausnummer]
        <br />
        [PLZ + Ort]
        <br />
        <br />
        E-Mail: [deine@email.de]
        <br />
        Tel: [+49 ...]
        <br />
        <br />
        USt-IdNr: [falls vorhanden]
        <br />
        Handelsregister: [falls vorhanden]
      </p>
    </div>
  );
}
