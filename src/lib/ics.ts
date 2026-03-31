export interface IcsEvent {
  uid: string;
  zusammenfassung: string;
  datum: string;
  start: string;
  ende: string;
  ort?: string;
  beschreibung?: string;
  organisator_email?: string;
  organisator_name?: string;
}

function toIcsDateTime(datum: string, zeit: string): string {
  return `${datum.replace(/-/g, "")}T${zeit.replace(":", "")}00`;
}

export function generiereIcs(event: IcsEvent): string {
  const jetzt = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Einsatzplanung//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${event.uid}@einsatzplanung`,
    `DTSTAMP:${jetzt}Z`,
    `DTSTART:${toIcsDateTime(event.datum, event.start)}`,
    `DTEND:${toIcsDateTime(event.datum, event.ende)}`,
    `SUMMARY:${event.zusammenfassung}`,
    event.ort ? `LOCATION:${event.ort}` : "",
    event.beschreibung
      ? `DESCRIPTION:${event.beschreibung.replace(/\n/g, "\\n")}`
      : "",
    event.organisator_email
      ? `ORGANIZER;CN="${event.organisator_name ?? "Einsatzplanung"}":mailto:${event.organisator_email}`
      : "",
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "BEGIN:VALARM",
    "TRIGGER:-PT60M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Einsatz in 1 Stunde",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export function generiereIcsUpdate(event: IcsEvent, sequence = 1): string {
  return generiereIcs(event).replace("SEQUENCE:0", `SEQUENCE:${sequence}`);
}

export function generiereIcsCancel(event: IcsEvent): string {
  return generiereIcs(event)
    .replace("METHOD:REQUEST", "METHOD:CANCEL")
    .replace("STATUS:CONFIRMED", "STATUS:CANCELLED")
    .replace("SEQUENCE:0", "SEQUENCE:2");
}
