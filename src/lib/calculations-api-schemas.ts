import { z } from "zod";

export const calculationStatusValues = ["entwurf", "aktiv", "archiviert"] as const;

export const CalculationStatusSchema = z.enum(calculationStatusValues);

/** GET /api/calculations — Query-Parameter */
export const CalculationListQuerySchema = z.object({
  project_id: z.string().uuid().optional(),
  status: CalculationStatusSchema.optional(),
  search: z.string().max(500).optional(),
});

/** POST /api/calculations — Body */
export const CalculationCreateBodySchema = z.object({
  title: z.string().min(1, "Titel erforderlich").max(500),
  project_id: z.string().uuid().nullable().optional(),
  customer_id: z.string().uuid().nullable().optional(),
  status: CalculationStatusSchema.optional(),
  margin_target_percent: z
    .number()
    .min(0)
    .max(100)
    .nullable()
    .optional(),
  quick_mode: z.boolean().optional(),
  notes: z.string().max(20000).nullable().optional(),
});

/** PATCH /api/calculations/[id] — Body */
export const CalculationUpdateBodySchema = z
  .object({
    title: z.string().min(1).max(500).optional(),
    status: CalculationStatusSchema.optional(),
    notes: z.string().max(20000).nullable().optional(),
    margin_target_percent: z
      .number()
      .min(0)
      .max(100)
      .nullable()
      .optional(),
    project_id: z.string().uuid().nullable().optional(),
    customer_id: z.string().uuid().nullable().optional(),
    quick_mode: z.boolean().optional(),
  })
  .strict();
