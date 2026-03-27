import { format } from "date-fns";
import { de } from "date-fns/locale";

/**
 * Datum für deutsche Anzeige formatieren.
 */
export function formatiereDatum(datum: Date, muster = "dd.MM.yyyy"): string {
  return format(datum, muster, { locale: de });
}
