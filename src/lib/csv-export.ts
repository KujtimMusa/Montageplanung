/**
 * Client-seitiger CSV-Download (UTF-8 mit BOM für Excel).
 */
function zelleEscapen(wert: unknown): string {
  const s = String(wert ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

export function exportAlsCSV(
  daten: Record<string, unknown>[],
  dateiname: string
): void {
  if (!daten.length) return;
  const headers = Object.keys(daten[0]!);
  const kopf = headers.map(zelleEscapen).join(",");
  const zeilen = daten.map((r) =>
    headers.map((h) => zelleEscapen(r[h])).join(",")
  );
  const csv = ["\uFEFF" + kopf, ...zeilen].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = dateiname.endsWith(".csv") ? dateiname : `${dateiname}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
