import { z } from "zod";
import { PositionTypeSchema } from "@/app/api/calculations/[id]/positions/position-schemas";

const DetailsJsonSchema = z.record(z.string(), z.unknown());

const TagSchema = z
  .array(z.string().max(50))
  .max(10)
  .optional();

export const PositionLibraryListQuerySchema = z.object({
  trade_category_id: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
});

export const PositionLibraryCreateSchema = z.object({
  name: z.string().min(1).max(500),
  position_type: PositionTypeSchema,
  trade_category_id: z.string().uuid().nullable().optional(),
  default_hours: z.number().min(0).nullable().optional(),
  default_unit: z.string().max(50).optional(),
  tags: TagSchema,
  details: DetailsJsonSchema.optional(),
});

export const PositionLibraryPatchSchema = z
  .object({
    name: z.string().min(1).max(500).optional(),
    position_type: PositionTypeSchema.optional(),
    trade_category_id: z.string().uuid().nullable().optional(),
    default_hours: z.number().min(0).nullable().optional(),
    default_unit: z.string().max(50).optional(),
    tags: TagSchema,
    details: DetailsJsonSchema.optional(),
    is_active: z.boolean().optional(),
  })
  .strict();
