export type AbwesenheitTyp = "urlaub" | "krank" | "fortbildung" | "sonstiges";

export type AbwesenheitStatus = "beantragt" | "genehmigt" | "abgelehnt";

export type Abwesenheit = {
  id: string;
  employee_id: string;
  employee_name: string;
  /** Rohwert aus der DB (z. B. Personio-Synonyme) für Badge-Farben */
  type_raw: string;
  type: AbwesenheitTyp;
  start_date: string;
  end_date: string;
  status: AbwesenheitStatus;
  notes: string | null;
  quelle: "manuell" | "personio";
  created_at: string;
};

export type AbwesenheitFormWerte = {
  employee_id: string;
  type: AbwesenheitTyp;
  start_date: string;
  end_date: string;
  status: AbwesenheitStatus;
  notes?: string;
};

export const ABWESENHEIT_TYPEN: {
  value: AbwesenheitTyp;
  label: string;
  emoji: string;
  farbe: string;
}[] = [
  {
    value: "urlaub",
    label: "Urlaub",
    emoji: "🌴",
    farbe: "bg-blue-500/20 text-blue-400",
  },
  {
    value: "krank",
    label: "Krank",
    emoji: "🤒",
    farbe: "bg-red-500/20 text-red-400",
  },
  {
    value: "fortbildung",
    label: "Fortbildung",
    emoji: "📚",
    farbe: "bg-violet-500/20 text-violet-400",
  },
  {
    value: "sonstiges",
    label: "Sonstiges",
    emoji: "📎",
    farbe: "bg-zinc-500/20 text-zinc-400",
  },
];

export const ABWESENHEIT_STATUS: {
  value: AbwesenheitStatus;
  label: string;
  farbe: string;
}[] = [
  {
    value: "beantragt",
    label: "Ausstehend",
    farbe: "bg-yellow-500/20 text-yellow-400",
  },
  {
    value: "genehmigt",
    label: "Genehmigt",
    farbe: "bg-emerald-500/20 text-emerald-400",
  },
  {
    value: "abgelehnt",
    label: "Abgelehnt",
    farbe: "bg-red-500/20 text-red-400",
  },
];
