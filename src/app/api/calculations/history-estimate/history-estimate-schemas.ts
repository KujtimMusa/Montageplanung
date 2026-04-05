import { z } from "zod";

export const HistoryEstimateQuerySchema = z.object({
  trade_category_id: z.string().uuid(),
  task_description: z.string().max(200).optional(),
});

export type HistoryConfidence = "hoch" | "mittel" | "niedrig" | "keine_daten";
