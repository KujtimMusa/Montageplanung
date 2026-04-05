import { z } from "zod";

/** Datenbank-/API-Werte für position_type (Migration: CHECK auf public.calculation_positions). */
export const positionTypeValues = [
  "arbeit",
  "material",
  "pauschal",
  "fremdleistung",
  "nachlass",
] as const;

export const PositionTypeSchema = z.enum(positionTypeValues);

const DetailsJsonSchema = z.record(z.string(), z.unknown());

/**
 * JSON-Feld `details` (jsonb) — semantische Struktur hängt von `position_type` ab (Validierung im UI).
 *
 * @typedef {object} PositionDetails
 *
 * — `arbeit` —
 * @property {string} [taetigkeit]
 * @property {string} [einheit]
 * @property {number} [menge]
 * @property {number} [stundensatz]
 * @property {number} [stunden] geplante Stunden / Vorschlag
 *
 * — `material` —
 * @property {string} [artikelnummer]
 * @property {string} [bezeichnung]
 * @property {number} [menge]
 * @property {number} [ek_preis]
 * @property {number} [aufschlag_pct]
 * @property {number} [vk_preis]
 *
 * — `pauschal` —
 * @property {string} [beschreibung]
 * @property {number} [betrag]
 *
 * — `fremdleistung` —
 * @property {string} [subunternehmer_name]
 * @property {string} [leistungsbeschreibung]
 * @property {number} [betrag]
 * @property {number} [aufschlag_pct]
 *
 * — `nachlass` —
 * @property {'pct'|'fix'} [mode]
 * @property {number} [wert] Prozent oder Euro je nach mode
 */
export type PositionDetails = Record<string, unknown>;

export const PositionCreateBodySchema = z.object({
  title: z.string().min(1).max(2000),
  position_type: PositionTypeSchema,
  trade_category_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().int().optional(),
  details: DetailsJsonSchema.optional(),
  line_total_net: z.number().nullable().optional(),
  library_item_id: z.string().uuid().nullable().optional(),
});

const PositionBulkUpdateFieldsSchema = z
  .object({
    title: z.string().min(1).max(2000).optional(),
    position_type: PositionTypeSchema.optional(),
    trade_category_id: z.string().uuid().nullable().optional(),
    sort_order: z.number().int().optional(),
    details: DetailsJsonSchema.optional(),
    line_total_net: z.number().nullable().optional(),
    library_item_id: z.string().uuid().nullable().optional(),
  })
  .strict();

export const PositionBulkItemSchema = z
  .object({
    id: z.string().uuid(),
  })
  .merge(PositionBulkUpdateFieldsSchema);

export const PositionBulkPutBodySchema = z
  .array(PositionBulkItemSchema)
  .min(1, "Mindestens eine Position erforderlich");
