export function logFehler(
  kontext: string,
  fehler: unknown,
  extra?: Record<string, unknown>
) {
  console.error(`[${kontext}]`, {
    fehler: fehler instanceof Error ? fehler.message : String(fehler),
    zeitpunkt: new Date().toISOString(),
    ...extra,
  });
}
