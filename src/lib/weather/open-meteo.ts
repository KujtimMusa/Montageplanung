/**
 * Open-Meteo Vorhersage (Phase 5) — ohne API-Key.
 */
export async function wetterVorhersageLaden(
  breite: number,
  laenge: number,
  start: string,
  ende: string
): Promise<unknown> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(breite));
  url.searchParams.set("longitude", String(laenge));
  url.searchParams.set("timezone", "Europe/Berlin");
  url.searchParams.set("start_date", start);
  url.searchParams.set("end_date", ende);
  url.searchParams.set(
    "daily",
    "weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,snowfall_sum"
  );

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Open-Meteo Fehler: ${res.status}`);
  }
  return res.json();
}
