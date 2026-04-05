export type TimeComparisonPositionConfidence =
  | "keine_daten"
  | "laufend"
  | "vollstaendig";

export type TimeComparisonPositionRow = {
  position_id: string;
  title: string;
  position_type: string;
  planned_hours: number | null;
  actual_hours: number;
  time_entry_count: number;
  deviation_pct: number | null;
  confidence: TimeComparisonPositionConfidence;
};
