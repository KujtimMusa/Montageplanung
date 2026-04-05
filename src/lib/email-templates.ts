const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #09090b;
  color: #e4e4e7;
  padding: 32px;
  max-width: 520px;
  margin: 0 auto;
  border-radius: 16px;
`;
const CARD_STYLE = `
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 20px;
  margin: 16px 0;
`;
const LABEL_STYLE = `
  color: #71717a;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 4px;
`;
const VALUE_STYLE = `
  color: #f4f4f5;
  font-size: 14px;
  font-weight: 500;
`;
const BADGE_STYLE = (color: string) => `
  display: inline-block;
  background: ${color}22;
  border: 1px solid ${color}44;
  color: ${color};
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
`;
const FOOTER_STYLE = `
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #27272a;
  color: #52525b;
  font-size: 11px;
`;

export function templateEinsatzNeu(data: {
  mitarbeiter_name: string;
  projekt: string;
  datum: string;
  start: string;
  ende: string;
  adresse?: string;
  anmerkung?: string;
  betrieb_name?: string;
  /** Optional: Link zur Monteur-PWA (Einsätze). */
  pwa_link?: string;
}): { subject: string; html: string } {
  const pwaBlock = data.pwa_link
    ? `<div style="margin:20px 0">
    <a href="${data.pwa_link}" style="display:inline-block;background:#01696f;color:#fff;text-decoration:none;padding:14px 22px;border-radius:12px;font-size:15px;font-weight:600">
      Einsätze in der App öffnen
    </a>
    <p style="color:#52525b;font-size:11px;margin:10px 0 0">Monteur-App (PWA) — mit diesem Link ohne Login.</p>
  </div>`
    : "";
  return {
    subject: `📋 Neuer Einsatz: ${data.projekt} am ${data.datum}`,
    html: `
<div style="${BASE_STYLE}">
  <div style="margin-bottom:24px">
    <p style="color:#a78bfa;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 8px">
      Einsatzplanung
    </p>
    <h1 style="color:#f4f4f5;font-size:22px;font-weight:700;margin:0">Du wurdest eingeplant</h1>
    <p style="color:#71717a;font-size:14px;margin:8px 0 0">
      Hallo ${data.mitarbeiter_name}, hier sind deine Einsatzdetails.
    </p>
  </div>

  <div style="${CARD_STYLE}">
    <div style="margin-bottom:16px">
      <p style="${LABEL_STYLE}">Projekt</p>
      <p style="${VALUE_STYLE}">${data.projekt}</p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:${data.adresse ? "16px" : "0"}">
      <div>
        <p style="${LABEL_STYLE}">Datum</p>
        <p style="${VALUE_STYLE}">${data.datum}</p>
      </div>
      <div>
        <p style="${LABEL_STYLE}">Uhrzeit</p>
        <p style="${VALUE_STYLE}">${data.start} - ${data.ende} Uhr</p>
      </div>
    </div>
    ${data.adresse ? `<div><p style="${LABEL_STYLE}">Einsatzort</p><p style="${VALUE_STYLE}">${data.adresse}</p></div>` : ""}
    ${
      data.anmerkung
        ? `<div style="margin-top:16px;padding-top:16px;border-top:1px solid #27272a">
      <p style="${LABEL_STYLE}">Hinweis</p>
      <p style="${VALUE_STYLE}">${data.anmerkung}</p>
    </div>`
        : ""
    }
  </div>
  ${pwaBlock}

  <p style="color:#71717a;font-size:12px;margin-top:20px;line-height:1.5;max-width:520px">
    <strong style="color:#e4e4e7">Installierte App nutzen:</strong> E-Mail in <strong>Chrome</strong> oder <strong>Safari</strong> öffnen (nicht in der Gmail-/Outlook-Vorschau) und den Button antippen.
    iOS öffnet Links aus der Mail oft in Safari – das ist normal; die gespeicherte Home-Bildschirm-App können Sie dort über dieselbe Adresse starten.
  </p>
  <p style="color:#52525b;font-size:11px;margin-top:12px;line-height:1.5;max-width:520px">
    Android (Chrome): Wenn die App installiert ist, kann der gleiche Link in Chrome dieselbe Sitzung nutzen.
    In Safari: <strong style="color:#a1a1aa">Teilen</strong> → <strong style="color:#a1a1aa">„Zum Home-Bildschirm“</strong> für die Monteur-App.
  </p>

  <div style="${FOOTER_STYLE}">
    ${data.betrieb_name ?? "Einsatzplanung"} • Diese E-Mail wurde automatisch generiert.
  </div>
</div>`,
  };
}

/** E-Mail mit PWA-Link (Monteur) — inhaltlich wie templateEinsatzNeu inkl. CTA. */
export function templateEinsatzMonteur(data: {
  monteursName: string;
  projektName: string;
  adresse: string;
  datum: string;
  startzeit: string;
  teamMitglieder: string[];
  pwaLink: string;
  firmenName: string;
}): { subject: string; html: string } {
  const team =
    data.teamMitglieder.length > 0
      ? `<p style="${LABEL_STYLE}">Team</p><p style="${VALUE_STYLE}">${data.teamMitglieder.join(", ")}</p>`
      : "";
  return {
    subject: `Neuer Einsatz: ${data.projektName} am ${data.datum}`,
    html: `
<div style="${BASE_STYLE}">
  <h1 style="color:#f4f4f5;font-size:20px;font-weight:700;margin:0 0 12px">Hallo ${data.monteursName}</h1>
  <div style="${CARD_STYLE}">
    <p style="${LABEL_STYLE}">Projekt</p>
    <p style="${VALUE_STYLE}">${data.projektName}</p>
    <p style="margin-top:12px;${LABEL_STYLE}">Datum</p>
    <p style="${VALUE_STYLE}">${data.datum}</p>
    <p style="margin-top:12px;${LABEL_STYLE}">Start</p>
    <p style="${VALUE_STYLE}">${data.startzeit}</p>
    <p style="margin-top:12px;${LABEL_STYLE}">Adresse</p>
    <p style="${VALUE_STYLE}">${data.adresse || "—"}</p>
    ${team ? `<div style="margin-top:12px">${team}</div>` : ""}
  </div>
  <div style="margin:20px 0">
    <a href="${data.pwaLink}" style="display:inline-block;background:#01696f;color:#fff;text-decoration:none;padding:14px 22px;border-radius:12px;font-size:15px;font-weight:600">
      Zur Monteur-App
    </a>
  </div>
  <div style="${FOOTER_STYLE}">${data.firmenName}</div>
</div>`,
  };
}

export function templateKundenZugang(data: {
  kundenName: string;
  projektName: string;
  firmenName: string;
  kundenLink: string;
}): { subject: string; html: string } {
  return {
    subject: `Ihr Projektportal: ${data.projektName}`,
    html: `
<div style="${BASE_STYLE}">
  <h1 style="color:#f4f4f5;font-size:20px;font-weight:700;margin:0 0 8px">Hallo ${data.kundenName}</h1>
  <p style="color:#71717a;font-size:14px;margin:0 0 16px">Hier ist Ihr persönlicher Link zum Projektstatus bei ${data.firmenName}.</p>
  <div style="margin:20px 0">
    <a href="${data.kundenLink}" style="display:inline-block;background:#01696f;color:#fff;text-decoration:none;padding:14px 22px;border-radius:12px;font-size:15px;font-weight:600">
      Projekt öffnen
    </a>
  </div>
  <p style="color:#52525b;font-size:12px">${data.projektName}</p>
  <p style="color:#52525b;font-size:11px;margin-top:16px;line-height:1.5">
    Tipp: Seite speichern — auf dem Smartphone <strong style="color:#a1a1aa">Teilen</strong> →
    <strong style="color:#a1a1aa">Zum Home-Bildschirm</strong>, damit Sie Termine immer aktuell sehen (ohne App-Store).
  </p>
</div>`,
  };
}

/** Hinweis nach Planungsänderung — Link zum Kundenportal. */
export function templateKundenTermineUpdate(data: {
  kundenName: string;
  projektName: string;
  firmenName: string;
  portalLink: string;
}): { subject: string; html: string } {
  return {
    subject: `Termine aktualisiert: ${data.projektName}`,
    html: `
<div style="${BASE_STYLE}">
  <h1 style="color:#f4f4f5;font-size:18px;font-weight:700;margin:0 0 8px">Hallo ${data.kundenName}</h1>
  <p style="color:#71717a;font-size:14px;margin:0 0 16px">
    Für Ihr Projekt „${data.projektName}“ bei ${data.firmenName} gibt es neue oder geänderte Termine — wer wann vor Ort ist, sehen Sie im Portal.
  </p>
  <div style="margin:20px 0">
    <a href="${data.portalLink}" style="display:inline-block;background:#01696f;color:#fff;text-decoration:none;padding:14px 22px;border-radius:12px;font-size:15px;font-weight:600">
      Termine &amp; Status ansehen
    </a>
  </div>
  <p style="color:#52525b;font-size:11px;line-height:1.5">
    Link zum Merken:<br/>
    <span style="word-break:break-all;color:#71717a">${data.portalLink}</span>
  </p>
</div>`,
  };
}

export function templateKundenNachrichtAnKoordinator(data: {
  projektName: string;
  firmenName: string;
  absenderName: string;
  inhalt: string;
}): { subject: string; html: string } {
  return {
    subject: `Nachricht zu „${data.projektName}“ (Kundenportal)`,
    html: `
<div style="${BASE_STYLE}">
  <p style="color:#a78bfa;font-size:12px;font-weight:600;margin:0 0 8px">${data.firmenName}</p>
  <h1 style="color:#f4f4f5;font-size:18px;font-weight:700;margin:0 0 12px">Neue Kunden-Nachricht</h1>
  <p style="${LABEL_STYLE}">Projekt</p>
  <p style="${VALUE_STYLE}">${data.projektName}</p>
  <p style="margin-top:12px;${LABEL_STYLE}">Von</p>
  <p style="${VALUE_STYLE}">${data.absenderName}</p>
  <div style="${CARD_STYLE};margin-top:16px">
    <p style="color:#e4e4e7;font-size:14px;line-height:1.6;white-space:pre-wrap">${data.inhalt}</p>
  </div>
</div>`,
  };
}

export function templateEinsatzGeaendert(data: {
  mitarbeiter_name: string;
  projekt: string;
  datum_alt: string;
  datum_neu: string;
  start_neu: string;
  ende_neu: string;
  betrieb_name?: string;
}): { subject: string; html: string } {
  return {
    subject: `🔄 Einsatz geändert: ${data.projekt}`,
    html: `
<div style="${BASE_STYLE}">
  <div style="margin-bottom:24px">
    <p style="color:#f59e0b;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 8px">
      Planungsänderung
    </p>
    <h1 style="color:#f4f4f5;font-size:22px;font-weight:700;margin:0">Dein Einsatz wurde geändert</h1>
    <p style="color:#71717a;font-size:14px;margin:8px 0 0">
      Hallo ${data.mitarbeiter_name}, bitte beachte die Änderung deines Einsatzes.
    </p>
  </div>

  <div style="${CARD_STYLE}">
    <p style="${LABEL_STYLE}">Projekt</p>
    <p style="${VALUE_STYLE};margin-bottom:16px">${data.projekt}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div style="padding:12px;background:#27272a;border-radius:8px">
        <p style="${LABEL_STYLE}">Vorher</p>
        <p style="color:#71717a;font-size:14px;text-decoration:line-through">${data.datum_alt}</p>
      </div>
      <div style="padding:12px;background:#1c1917;border:1px solid #a78bfa44;border-radius:8px">
        <p style="${LABEL_STYLE}">Jetzt</p>
        <p style="color:#a78bfa;font-size:14px;font-weight:600">${data.datum_neu}<br/>${data.start_neu}-${data.ende_neu} Uhr</p>
      </div>
    </div>
  </div>

  <div style="${FOOTER_STYLE}">
    ${data.betrieb_name ?? "Einsatzplanung"} • Diese E-Mail wurde automatisch generiert.
  </div>
</div>`,
  };
}

export function templateKonfliktKoordinator(data: {
  koordinator_name: string;
  anzahl_konflikte: number;
  konflikte: Array<{
    mitarbeiter: string;
    projekt: string;
    datum: string;
    beschreibung: string;
  }>;
  betrieb_name?: string;
}): { subject: string; html: string } {
  return {
    subject: `⚠️ ${data.anzahl_konflikte} Planungskonflikt${data.anzahl_konflikte > 1 ? "e" : ""} erkannt`,
    html: `
<div style="${BASE_STYLE}">
  <div style="margin-bottom:24px">
    <span style="${BADGE_STYLE("#f59e0b")}">⚠️ Planungskonflikt</span>
    <h1 style="color:#f4f4f5;font-size:22px;font-weight:700;margin:16px 0 0">
      ${data.anzahl_konflikte} Konflikt${data.anzahl_konflikte > 1 ? "e" : ""} erkannt
    </h1>
    <p style="color:#71717a;font-size:14px;margin:8px 0 0">
      Hallo ${data.koordinator_name}, bitte prüfe folgende Konflikte.
    </p>
  </div>
  ${data.konflikte
    .map(
      (k) => `
  <div style="${CARD_STYLE}">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <p style="color:#f4f4f5;font-size:14px;font-weight:600;margin:0">${k.mitarbeiter}</p>
      <p style="color:#71717a;font-size:12px;margin:0">${k.datum}</p>
    </div>
    <p style="${LABEL_STYLE}">Projekt</p>
    <p style="${VALUE_STYLE};margin-bottom:8px">${k.projekt}</p>
    <p style="color:#fbbf24;font-size:13px">${k.beschreibung}</p>
  </div>`
    )
    .join("")}
  <div style="${FOOTER_STYLE}">
    ${data.betrieb_name ?? "Einsatzplanung"} • Diese E-Mail wurde automatisch generiert.
  </div>
</div>`,
  };
}

export function templateWetterWarnung(data: {
  koordinator_name: string;
  einsaetze: Array<{
    projekt: string;
    datum: string;
    mitarbeiter: string;
    warnung: string;
  }>;
  betrieb_name?: string;
}): { subject: string; html: string } {
  return {
    subject: `🌧️ Wetter-Warnung für ${data.einsaetze.length} Außeneinsatz${data.einsaetze.length > 1 ? "e" : ""}`,
    html: `
<div style="${BASE_STYLE}">
  <div style="margin-bottom:24px">
    <span style="${BADGE_STYLE("#60a5fa")}">🌧️ Wetterwarnung</span>
    <h1 style="color:#f4f4f5;font-size:22px;font-weight:700;margin:16px 0 0">Wetterrisiko bei Außeneinsätzen</h1>
    <p style="color:#71717a;font-size:14px;margin:8px 0 0">
      Hallo ${data.koordinator_name}, folgende Einsätze könnten betroffen sein.
    </p>
  </div>
  ${data.einsaetze
    .map(
      (e) => `
  <div style="${CARD_STYLE}">
    <p style="color:#f4f4f5;font-size:14px;font-weight:600;margin:0 0 8px">${e.projekt}</p>
    <p style="${LABEL_STYLE}">Datum & Mitarbeiter</p>
    <p style="${VALUE_STYLE};margin-bottom:8px">${e.datum} · ${e.mitarbeiter}</p>
    <p style="color:#93c5fd;font-size:13px">${e.warnung}</p>
  </div>`
    )
    .join("")}
  <div style="${FOOTER_STYLE}">
    ${data.betrieb_name ?? "Einsatzplanung"} • Diese E-Mail wurde automatisch generiert.
  </div>
</div>`,
  };
}

export function templateDienstleisterMeldung(data: {
  koordinator_name: string;
  dienstleister_name: string;
  kontakt_name?: string;
  meldung: string;
  datum: string;
  betrieb_name?: string;
}): { subject: string; html: string } {
  return {
    subject: `📨 Nachricht von ${data.dienstleister_name}`,
    html: `
<div style="${BASE_STYLE}">
  <div style="margin-bottom:24px">
    <span style="${BADGE_STYLE("#34d399")}">Dienstleister</span>
    <h1 style="color:#f4f4f5;font-size:22px;font-weight:700;margin:16px 0 0">
      ${data.dienstleister_name} hat sich gemeldet
    </h1>
    <p style="color:#71717a;font-size:14px;margin:8px 0 0">
      Hallo ${data.koordinator_name}, neue Nachricht vom Dienstleister.
    </p>
  </div>
  <div style="${CARD_STYLE}">
    ${
      data.kontakt_name
        ? `<p style="${LABEL_STYLE}">Kontakt</p><p style="${VALUE_STYLE};margin-bottom:12px">${data.kontakt_name}</p>`
        : ""
    }
    <p style="${LABEL_STYLE}">Nachricht</p>
    <p style="color:#e4e4e7;font-size:14px;line-height:1.6">${data.meldung}</p>
    <p style="color:#52525b;font-size:12px;margin-top:12px">${data.datum}</p>
  </div>
  <div style="${FOOTER_STYLE}">
    ${data.betrieb_name ?? "Einsatzplanung"} • Diese E-Mail wurde automatisch generiert.
  </div>
</div>`,
  };
}

export function templateKrankmeldungKoordinator(data: {
  koordinator_name: string;
  mitarbeiter_name: string;
  datum_von: string;
  datum_bis?: string;
  betroffene_einsaetze: number;
  betrieb_name?: string;
}): { subject: string; html: string } {
  return {
    subject: `🤒 Krankmeldung: ${data.mitarbeiter_name}`,
    html: `
<div style="${BASE_STYLE}">
  <div style="margin-bottom:24px">
    <span style="${BADGE_STYLE("#f87171")}">Krankmeldung</span>
    <h1 style="color:#f4f4f5;font-size:22px;font-weight:700;margin:16px 0 0">
      ${data.mitarbeiter_name} ist krank
    </h1>
    <p style="color:#71717a;font-size:14px;margin:8px 0 0">
      Hallo ${data.koordinator_name}, bitte prüfe die betroffenen Einsätze.
    </p>
  </div>

  <div style="${CARD_STYLE}">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div>
        <p style="${LABEL_STYLE}">Abwesend ab</p>
        <p style="${VALUE_STYLE}">${data.datum_von}</p>
      </div>
      ${
        data.datum_bis
          ? `<div>
        <p style="${LABEL_STYLE}">Voraussichtlich bis</p>
        <p style="${VALUE_STYLE}">${data.datum_bis}</p>
      </div>`
          : ""
      }
    </div>
    ${
      data.betroffene_einsaetze > 0
        ? `<div style="margin-top:16px;padding:12px;background:#450a0a;border:1px solid #991b1b44;border-radius:8px">
      <p style="color:#fca5a5;font-size:13px;margin:0">⚠️ ${data.betroffene_einsaetze} betroffene Einsätze müssen neu besetzt werden.</p>
    </div>`
        : ""
    }
  </div>

  <div style="${FOOTER_STYLE}">
    ${data.betrieb_name ?? "Einsatzplanung"} • Diese E-Mail wurde automatisch generiert.
  </div>
</div>`,
  };
}
