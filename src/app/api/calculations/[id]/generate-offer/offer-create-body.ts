import { z } from "zod";

export const OfferCreateBodySchema = z.object({
  position_display: z.enum(["detail", "aggregiert"]).default("detail"),
  include_sections: z.array(z.string()).optional(),
  intro_text: z.string().max(10000).optional(),
  template_slug: z.string().optional(),
  validity_days: z.number().int().min(1).max(365).default(30),
});
