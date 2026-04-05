"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  GripVertical,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { OfferModal } from "@/components/kalkulation/OfferModal";
import { PositionDetailModal } from "@/components/kalkulation/PositionDetailModal";

// ─── Typen (lokal) ───────────────────────────────────────────────────────────

type PositionType =
  | "arbeit"
  | "material"
  | "pauschal"
  | "fremdleistung"
  | "nachlass";

type CalculationPosition = {
  id: string;
  calculation_id: string;
  trade_category_id: string | null;
  position_type: PositionType;
  sort_order: number;
  title: string;
  details: Record<string, unknown>;
  line_total_net: number | null;
  library_item_id: string | null;
  trade_categories: { id: string; name: string } | null;
};

type Calculation = {
  id: string;
  title: string;
  status: "entwurf" | "aktiv" | "archiviert";
  project_id: string | null;
  customer_id: string | null;
  margin_target_percent: number | null;
  quick_mode: boolean;
  notes: string | null;
  projects: { title: string; status: string } | null;
  customers: { company_name: string } | null;
  calculation_positions: CalculationPosition[];
};

type TradeCategory = { id: string; name: string };

type LibraryItem = {
  id: string;
  name: string;
  position_type: PositionType;
  default_hours: number | null;
  default_unit: string;
  default_details: Record<string, unknown>;
  trade_category_id: string | null;
  tags: string[];
  trade_categories: { id: string; name: string } | null;
};

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function formatEuro(n: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

function num(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const p = parseFloat(v.replace(",", "."));
    return Number.isNaN(p) ? 0 : p;
  }
  return 0;
}

function embedRelation<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] as T) ?? null : (v as T);
}

const TRADE_DOT_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-orange-500",
  "bg-purple-500",
  "bg-yellow-500",
  "bg-pink-500",
  "bg-cyan-500",
] as const;

function tradeCategoryDotClass(name: string): string {
  if (!name.length) return TRADE_DOT_COLORS[0];
  const i = Math.abs(name.charCodeAt(0)) % TRADE_DOT_COLORS.length;
  return TRADE_DOT_COLORS[i] ?? "bg-zinc-500";
}

function positionTypeDotClass(type: PositionType): string {
  switch (type) {
    case "arbeit":
      return "bg-blue-500";
    case "material":
      return "bg-orange-500";
    case "pauschal":
      return "bg-purple-500";
    case "fremdleistung":
      return "bg-yellow-500";
    case "nachlass":
      return "bg-red-500";
    default:
      return "bg-zinc-500";
  }
}

function libraryTypeBadgeClass(type: PositionType): string {
  switch (type) {
    case "arbeit":
      return "bg-blue-950/80 text-blue-300";
    case "material":
      return "bg-orange-950/80 text-orange-300";
    case "pauschal":
      return "bg-purple-950/80 text-purple-300";
    case "fremdleistung":
      return "bg-yellow-950/80 text-yellow-300";
    case "nachlass":
      return "bg-red-950/80 text-red-300";
    default:
      return "bg-zinc-800 text-zinc-400";
  }
}

function lineAmountNonNachlass(pos: CalculationPosition): number {
  if (pos.line_total_net != null) return pos.line_total_net;
  const d = pos.details ?? {};
  switch (pos.position_type) {
    case "arbeit":
      return num(d.menge) * num(d.stundensatz);
    case "material":
      return num(d.menge) * num(d.vk_preis);
    case "pauschal":
      return num(d.betrag);
    case "fremdleistung": {
      const betrag = num(d.betrag);
      const pct = num(d.aufschlag_pct);
      return betrag * (1 + pct / 100);
    }
    default:
      return 0;
  }
}

function nachlassLineAmount(pos: CalculationPosition, zwischensumme: number): number {
  if (pos.line_total_net != null) return pos.line_total_net;
  const d = pos.details ?? {};
  const mode = d.mode;
  if (mode === "pct") {
    const w = d.wert !== undefined && d.wert !== null ? num(d.wert) : 0;
    return zwischensumme * (w / 100);
  }
  return num(d.wert);
}

function sumNonNachlassBefore(
  sorted: CalculationPosition[],
  endIdx: number
): number {
  let s = 0;
  for (let j = 0; j < endIdx; j++) {
    const p = sorted[j];
    if (p.position_type !== "nachlass") {
      s += lineAmountNonNachlass(p);
    }
  }
  return s;
}

function lineAmountFromPosition(
  pos: CalculationPosition,
  sorted: CalculationPosition[],
  index: number
): number {
  if (pos.position_type === "nachlass") {
    return nachlassLineAmount(pos, sumNonNachlassBefore(sorted, index));
  }
  return lineAmountNonNachlass(pos);
}

function calcSummary(positions: CalculationPosition[]) {
  const sorted = [...positions].sort((a, b) => a.sort_order - b.sort_order);
  let arbeitskosten = 0;
  let materialNetto = 0;
  let pauschalen = 0;
  let fremdleistung = 0;
  let nachlaesse = 0;
  let arbeitsStundenGesamt = 0;
  const lineAmounts = new Map<string, number>();

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    if (p.position_type === "arbeit") {
      arbeitsStundenGesamt += num(p.details?.menge);
    }
    const a = lineAmountFromPosition(p, sorted, i);
    lineAmounts.set(p.id, a);
    if (p.position_type === "nachlass") {
      nachlaesse += a;
    } else {
      switch (p.position_type) {
        case "arbeit":
          arbeitskosten += a;
          break;
        case "material":
          materialNetto += a;
          break;
        case "pauschal":
          pauschalen += a;
          break;
        case "fremdleistung":
          fremdleistung += a;
          break;
        default:
          break;
      }
    }
  }

  const nettoGesamt =
    arbeitskosten + materialNetto + pauschalen + fremdleistung - nachlaesse;
  const mwst = nettoGesamt * 0.19;
  const bruttoGesamt = nettoGesamt + mwst;
  const avgStundensatz =
    arbeitsStundenGesamt > 0 ? arbeitskosten / arbeitsStundenGesamt : null;

  const gesamtKosten = arbeitskosten + materialNetto;
  const margeAktuellPct =
    nettoGesamt > 0
      ? ((nettoGesamt - gesamtKosten) / nettoGesamt) * 100
      : 0;

  return {
    arbeitskosten,
    materialNetto,
    pauschalen,
    fremdleistung,
    nachlaesse,
    nettoGesamt,
    mwst,
    bruttoGesamt,
    arbeitsStundenGesamt,
    avgStundensatz,
    lineAmounts,
    margeAktuellPct,
  };
}

function normalizePosition(raw: unknown): CalculationPosition {
  const r = raw as Record<string, unknown>;
  return {
    id: r.id as string,
    calculation_id: r.calculation_id as string,
    trade_category_id: (r.trade_category_id as string | null) ?? null,
    position_type: r.position_type as PositionType,
    sort_order: typeof r.sort_order === "number" ? r.sort_order : 0,
    title: (r.title as string) ?? "",
    details: (r.details as Record<string, unknown>) ?? {},
    line_total_net: (r.line_total_net as number | null) ?? null,
    library_item_id: (r.library_item_id as string | null) ?? null,
    trade_categories: embedRelation<{ id: string; name: string }>(
      r.trade_categories as { id: string; name: string } | { id: string; name: string }[] | null
    ),
  };
}

function groupPositions(positions: CalculationPosition[]) {
  const sorted = [...positions].sort((a, b) => a.sort_order - b.sort_order);
  const order: string[] = [];
  const map = new Map<string, CalculationPosition[]>();
  for (const p of sorted) {
    const k = p.trade_category_id ?? "ohne";
    if (!map.has(k)) {
      order.push(k);
      map.set(k, []);
    }
    map.get(k)!.push(p);
  }
  return { order, map, sorted };
}

/** Gewerk-Gruppe für Sortier-Logik (kein gruppenübergreifendes Sortieren in MVP). */
function groupKey(p: CalculationPosition): string {
  return p.trade_category_id ?? "ohne";
}

// ─── DraggableLibraryItem (NEU) ────────────────────────────────────────────────

function DraggableLibraryItem({
  item,
  onAdd,
}: {
  item: LibraryItem;
  onAdd: (item: LibraryItem) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `lib__${item.id}`,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "mx-3 mb-1.5 cursor-grab rounded-lg border border-zinc-800/80 bg-zinc-900 p-2.5 transition-all",
        "hover:border-zinc-600 hover:bg-zinc-800/50 active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-tight text-zinc-200">{item.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                libraryTypeBadgeClass(item.position_type)
              )}
            >
              {item.position_type}
            </span>
            {item.default_hours != null && (
              <span className="text-[10px] text-zinc-600">{item.default_hours} Std.</span>
            )}
          </div>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-md p-0.5 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
          onClick={(e) => {
            e.stopPropagation();
            onAdd(item);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Hinzufügen"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── SortablePositionRow (NEU, ersetzt PositionRow) ─────────────────────────────

function SortablePositionRow({
  pos,
  lineAmount,
  onUpdateTitle,
  onOpenDetail,
  onDelete,
  editingTitleId,
  setEditingTitleId,
  draftTitle,
  setDraftTitle,
}: {
  pos: CalculationPosition;
  lineAmount: number;
  onUpdateTitle: (id: string, title: string) => void;
  onOpenDetail: (id: string) => void;
  onDelete: (id: string) => void;
  editingTitleId: string | null;
  setEditingTitleId: (id: string | null) => void;
  draftTitle: string;
  setDraftTitle: (s: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pos.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isEditing = editingTitleId === pos.id;

  const rechtsText =
    pos.position_type === "arbeit"
      ? `${num(pos.details?.menge)} h`
      : formatEuro(lineAmountNonNachlass(pos));

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2.5 border-b border-zinc-800/40 px-3 py-2.5 transition-colors",
        "hover:bg-zinc-800/30",
        isDragging && "bg-zinc-800/50"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab text-zinc-700 transition-colors hover:text-zinc-500 active:cursor-grabbing"
      >
        <GripVertical size={14} />
      </div>
      <div
        className={cn(
          "h-2 w-2 flex-shrink-0 rounded-full",
          positionTypeDotClass(pos.position_type)
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <Input
            className="h-auto border-0 border-b border-zinc-600 bg-transparent px-0 py-0 text-sm text-zinc-200 outline-none focus-visible:ring-0"
            value={draftTitle}
            autoFocus
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={() => {
              onUpdateTitle(pos.id, draftTitle.trim() || pos.title);
              setEditingTitleId(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="w-full truncate text-left text-sm text-zinc-200 transition-colors hover:text-zinc-100"
            onClick={() => {
              setEditingTitleId(pos.id);
              setDraftTitle(pos.title);
            }}
          >
            {pos.title}
          </button>
        )}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <span className="text-xs text-zinc-500">{rechtsText}</span>
        <span className="min-w-[80px] text-right text-sm font-medium text-zinc-100">
          {formatEuro(lineAmount)}
        </span>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            onClick={() => onOpenDetail(pos.id)}
          >
            <Settings2 size={14} />
          </button>
          <button
            type="button"
            className="rounded-md p-1 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-red-400"
            onClick={() => onDelete(pos.id)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KalkulationBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [calculation, setCalculation] = useState<Calculation | null>(null);
  const [positions, setPositions] = useState<CalculationPosition[]>([]);
  const [tradeCategories, setTradeCategories] = useState<TradeCategory[]>([]);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [laden, setLaden] = useState(true);
  const [speichern, setSpeichern] = useState(false);
  const [gespeichertAt, setGespeichertAt] = useState<Date | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  const [librarySearchInput, setLibrarySearchInput] = useState("");
  const [librarySearchDebounced, setLibrarySearchDebounced] = useState("");
  const [libraryTradeFilter, setLibraryTradeFilter] = useState<string>("");
  const [libraryIncludeGlobal, setLibraryIncludeGlobal] = useState(true);

  const [activePositionId, setActivePositionId] = useState<string | null>(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);

  const [titleEditing, setTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  const [projektOptionen, setProjektOptionen] = useState<
    { id: string; title: string }[]
  >([]);
  const [projectSelectId, setProjectSelectId] = useState<string>("none");
  const [notesDraft, setNotesDraft] = useState("");

  const [mounted, setMounted] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddTitel, setQuickAddTitel] = useState("");
  const [quickAddTyp, setQuickAddTyp] = useState<PositionType>("arbeit");
  const [quickAddGewerk, setQuickAddGewerk] = useState<string>("");
  const [quickAddLaden, setQuickAddLaden] = useState(false);

  // NEU: Drag & Drop Overlay
  const [activeLibraryItem, setActiveLibraryItem] = useState<LibraryItem | null>(null);
  const [activeDragPosition, setActiveDragPosition] = useState<CalculationPosition | null>(
    null
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextAutosave = useRef(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setLibrarySearchDebounced(librarySearchInput), 300);
    return () => window.clearTimeout(t);
  }, [librarySearchInput]);

  const libraryFiltered = useMemo(() => {
    let list = libraryItems;
    const term = librarySearchDebounced.trim().toLowerCase();
    if (term) {
      list = list.filter((it) => {
        if (it.name.toLowerCase().includes(term)) return true;
        return (it.tags ?? []).some((x) => x.toLowerCase().includes(term));
      });
    }
    if (libraryTradeFilter) {
      list = list.filter((it) => it.trade_category_id === libraryTradeFilter);
    }
    return list;
  }, [libraryItems, librarySearchDebounced, libraryTradeFilter]);

  const summary = useMemo(() => calcSummary(positions), [positions]);

  const { order: groupOrder, map: groupMap, sorted: sortedPositions } =
    useMemo(() => groupPositions(positions), [positions]);

  const loadLibrary = useCallback(async () => {
    try {
      const libRes = await fetch(
        `/api/position-library?include_global=${libraryIncludeGlobal ? "true" : "false"}`
      );
      if (!libRes.ok) {
        toast.error("Bibliothek konnte nicht geladen werden.");
        setLibraryItems([]);
        return;
      }
      const libJson = (await libRes.json()) as { items: LibraryItem[] };
      setLibraryItems(libJson.items ?? []);
    } catch {
      toast.error("Bibliothek konnte nicht geladen werden.");
      setLibraryItems([]);
    }
  }, [libraryIncludeGlobal]);

  const loadCalculation = useCallback(async () => {
    setLaden(true);
    setFehler(null);
    skipNextAutosave.current = true;
    try {
      const supabase = createClient();
      const [calcRes, tcRes] = await Promise.all([
        fetch(`/api/calculations/${id}`),
        supabase.from("trade_categories").select("id, name").order("name"),
      ]);

      if (!calcRes.ok) {
        const j = await calcRes.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Kalkulation nicht gefunden");
      }
      const calcJson = (await calcRes.json()) as { calculation: Calculation };
      const c = calcJson.calculation;
      const rawPos = (c.calculation_positions ?? []) as unknown[];
      const posList = rawPos.map(normalizePosition);

      setCalculation({
        ...c,
        projects: embedRelation<{ title: string; status: string }>(c.projects as unknown as { title: string; status: string } | { title: string; status: string }[] | null),
        customers: embedRelation<{ company_name: string }>(c.customers as unknown as { company_name: string } | { company_name: string }[] | null),
        calculation_positions: posList,
      });
      setPositions(posList);
      setTitleDraft(c.title);

      if (tcRes.error) {
        toast.error(`Gewerke: ${tcRes.error.message}`);
        setTradeCategories([]);
      } else {
        setTradeCategories((tcRes.data ?? []) as TradeCategory[]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Laden fehlgeschlagen";
      setFehler(msg);
      toast.error(msg);
    } finally {
      setLaden(false);
    }
  }, [id]);

  useEffect(() => {
    void loadCalculation();
  }, [loadCalculation]);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    if (!showProjectModal) return;
    void (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("projects")
        .select("id, title")
        .order("title");
      if (error) {
        toast.error(`Projekte: ${error.message}`);
        return;
      }
      setProjektOptionen(
        (data ?? []).map((p) => ({
          id: p.id as string,
          title: (p.title as string) ?? "",
        }))
      );
    })();
  }, [showProjectModal]);

  const schedulePositionsSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (positions.length === 0) {
        setSpeichern(false);
        return;
      }
      setSpeichern(true);
      try {
        const body = positions.map((p) => ({
          id: p.id,
          title: p.title,
          sort_order: p.sort_order,
          details: p.details,
          line_total_net: p.line_total_net,
          position_type: p.position_type,
          trade_category_id: p.trade_category_id,
          library_item_id: p.library_item_id,
        }));
        const res = await fetch(`/api/calculations/${id}/positions`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error ?? "PUT fehlgeschlagen");
        }
        setGespeichertAt(new Date());
      } catch {
        toast.error("Speichern fehlgeschlagen");
      } finally {
        setSpeichern(false);
      }
    }, 800);
  }, [id, positions]);

  useEffect(() => {
    if (!calculation) return;
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    schedulePositionsSave();
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [positions, calculation, schedulePositionsSave]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const patchCalculation = async (patch: Record<string, unknown>) => {
    const res = await fetch(`/api/calculations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error((j as { error?: string }).error ?? "Aktualisierung fehlgeschlagen");
      return false;
    }
    const j = (await res.json()) as { calculation?: Partial<Calculation> };
    if (j.calculation) {
      setCalculation((prev) => {
        if (!prev) return prev;
        const u = j.calculation!;
        return {
          ...prev,
          ...u,
          projects: prev.projects,
          customers: prev.customers,
          calculation_positions: prev.calculation_positions,
        };
      });
    }
    return true;
  };

  const commitTitle = async () => {
    const t = titleDraft.trim();
    if (!t || !calculation) return;
    if (t === calculation.title) {
      setTitleEditing(false);
      return;
    }
    const ok = await patchCalculation({ title: t });
    if (ok) {
      setTitleEditing(false);
      toast.success("Titel gespeichert");
    }
  };

  const updatePosition = (posId: string, partial: Partial<CalculationPosition>) => {
    setPositions((prev) =>
      prev.map((p) => {
        if (p.id !== posId) return p;
        const next = { ...p, ...partial };
        if (partial.trade_category_id !== undefined) {
          const tc = tradeCategories.find((t) => t.id === partial.trade_category_id);
          next.trade_categories =
            partial.trade_category_id && tc ? { id: tc.id, name: tc.name } : null;
        }
        return next;
      })
    );
  };

  /** NEU: Bibliothek auf Positionszeile → Ende derselben Gewerk-Gruppe (trade_category wie Drop-Ziel). */
  const addFromLibraryDragToGroup = async (
    item: LibraryItem,
    dropTarget: CalculationPosition,
    positionsSnapshot: CalculationPosition[]
  ) => {
    const gk = groupKey(dropTarget);
    const sorted = [...positionsSnapshot].sort((a, b) => a.sort_order - b.sort_order);
    const inGroup = sorted.filter((p) => groupKey(p) === gk);
    const maxSo = inGroup.length ? Math.max(...inGroup.map((p) => p.sort_order)) : -10;
    const sort_order = maxSo + 10;

    const details: Record<string, unknown> = {
      ...(item.default_details ?? {}),
    };
    if (item.position_type === "arbeit" && item.default_hours != null) {
      details.menge = item.default_hours;
    }

    const trade_category_id = dropTarget.trade_category_id;

    // TODO: usage_count der Bibliothek (z. B. supabase.rpc('increment_usage_count') oder API) — nicht MVP

    try {
      const res = await fetch(`/api/calculations/${id}/positions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.name,
          position_type: item.position_type,
          trade_category_id,
          details,
          line_total_net: null,
          library_item_id: item.id,
          sort_order,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Anlegen fehlgeschlagen");
      }
      const j = (await res.json()) as { position: unknown };
      const np = normalizePosition(j.position);
      setPositions((prev) => [...prev, np]);
      toast.success("Position hinzugefügt");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Position konnte nicht angelegt werden");
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const sid = event.active.id.toString();
    if (sid.startsWith("lib__")) {
      const libId = sid.slice(5);
      setActiveLibraryItem(libraryItems.find((i) => i.id === libId) ?? null);
      setActiveDragPosition(null);
    } else {
      setActiveLibraryItem(null);
      setActiveDragPosition(positions.find((p) => p.id === sid) ?? null);
    }
  };

  const handleDragCancel = () => {
    setActiveLibraryItem(null);
    setActiveDragPosition(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveLibraryItem(null);
    setActiveDragPosition(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    if (activeId.startsWith("lib__")) {
      if (overId.startsWith("lib__")) return;
      const libId = activeId.slice(5);
      const item = libraryItems.find((i) => i.id === libId);
      const overPos = positions.find((p) => p.id === overId);
      if (!item || !overPos) return;
      void addFromLibraryDragToGroup(item, overPos, positions);
      return;
    }

    if (activeId === overId) return;

    const activePos = positions.find((p) => p.id === activeId);
    const overPos = positions.find((p) => p.id === overId);
    if (!activePos || !overPos) return;

    if (groupKey(activePos) !== groupKey(overPos)) {
      // TODO: gruppenübergreifendes Sortieren — nicht MVP
      return;
    }

    setPositions((prev) => {
      const sorted = [...prev].sort((a, b) => a.sort_order - b.sort_order);
      const key = groupKey(activePos);
      const groupIndices: number[] = [];
      sorted.forEach((p, i) => {
        if (groupKey(p) === key) groupIndices.push(i);
      });
      const groupPos = groupIndices.map((i) => sorted[i]);
      const la = groupPos.findIndex((p) => p.id === activeId);
      const lo = groupPos.findIndex((p) => p.id === overId);
      if (la < 0 || lo < 0) return prev;
      const newGroup = arrayMove(groupPos, la, lo);
      const newSorted = [...sorted];
      groupIndices.forEach((gi, idx) => {
        newSorted[gi] = newGroup[idx];
      });
      return newSorted.map((p, i) => ({ ...p, sort_order: i * 10 }));
    });
  };

  const addFromLibrary = async (item: LibraryItem) => {
    const details: Record<string, unknown> = {
      ...(item.default_details ?? {}),
    };
    if (item.position_type === "arbeit" && item.default_hours != null) {
      details.menge = item.default_hours;
    }
    try {
      const res = await fetch(`/api/calculations/${id}/positions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.name,
          position_type: item.position_type,
          trade_category_id: item.trade_category_id,
          details,
          library_item_id: item.id,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Anlegen fehlgeschlagen");
      }
      const j = (await res.json()) as { position: unknown };
      const np = normalizePosition(j.position);
      setPositions((prev) => [...prev, np]);
      toast.success("Position eingefügt");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Position konnte nicht angelegt werden");
    }
  };

  const quickAddPosition = async () => {
    const titel = quickAddTitel.trim();
    if (titel.length < 1) {
      toast.error("Bitte einen Titel eingeben.");
      return;
    }
    setQuickAddLaden(true);
    try {
      const res = await fetch(`/api/calculations/${id}/positions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titel,
          position_type: quickAddTyp,
          trade_category_id: quickAddGewerk ? quickAddGewerk : null,
          details: {},
          sort_order: positions.length * 10,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Anlegen fehlgeschlagen");
      }
      const j = (await res.json()) as { position: unknown };
      const np = normalizePosition(j.position);
      setPositions((prev) => [...prev, np]);
      toast.success("Position hinzugefügt");
      setShowQuickAdd(false);
      setQuickAddTitel("");
      setQuickAddTyp("arbeit");
      setQuickAddGewerk("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Position konnte nicht angelegt werden");
    } finally {
      setQuickAddLaden(false);
    }
  };

  const deletePosition = async (posId: string) => {
    const prev = positions;
    setPositions((p) => p.filter((x) => x.id !== posId));
    try {
      const res = await fetch(`/api/calculations/${id}/positions/${posId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setPositions(prev);
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Löschen fehlgeschlagen");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Löschen fehlgeschlagen");
    }
  };

  const targetPct = calculation?.margin_target_percent;
  const margePct = summary.margeAktuellPct;
  const margeBadgeClass =
    targetPct == null
      ? "bg-zinc-800 text-zinc-400"
      : margePct > targetPct
        ? "bg-emerald-900/60 text-emerald-300"
        : Math.abs(margePct - targetPct) <= 5
          ? "bg-amber-900/60 text-amber-200"
          : "bg-red-900/60 text-red-300";

  if (laden && !calculation) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <Skeleton className="mb-4 h-10 w-64 bg-zinc-800" />
        <Skeleton className="h-[60vh] w-full bg-zinc-900" />
      </div>
    );
  }

  if (fehler || !calculation) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 p-6 text-zinc-300">
        <p>{fehler ?? "Kalkulation nicht gefunden."}</p>
        <Link
          href="/kalkulation"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Zur Übersicht
        </Link>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col overflow-hidden bg-zinc-950 text-zinc-100"
      style={{ height: "calc(100dvh - 56px)" }}
    >
      <header
        className={cn(
          "flex-none sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-zinc-800/80",
          "bg-zinc-950/90 px-4 backdrop-blur-sm"
        )}
      >
        <Link
          href="/kalkulation"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "shrink-0 gap-1.5 px-2 text-zinc-400 transition-colors hover:bg-transparent hover:text-zinc-200"
          )}
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Kalkulationen</span>
        </Link>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {titleEditing ? (
            <Input
              className="max-w-md border-0 border-b border-zinc-500 bg-transparent px-0 text-lg font-semibold text-zinc-100 outline-none focus-visible:ring-0"
              value={titleDraft}
              autoFocus
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => void commitTitle()}
              onKeyDown={(e) => {
                if (e.key === "Enter") void commitTitle();
              }}
            />
          ) : (
            <button
              type="button"
              className="truncate text-left text-lg font-semibold text-zinc-100 underline decoration-transparent decoration-2 underline-offset-4 transition-colors hover:decoration-zinc-700"
              onClick={() => {
                setTitleEditing(true);
                setTitleDraft(calculation.title);
              }}
            >
              {calculation.title}
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {gespeichertAt && !speichern && (
            <span className="text-xs text-zinc-600">
              <span className="text-emerald-500">●</span> Gespeichert
            </span>
          )}
          {speichern && (
            <span className="animate-pulse text-xs text-zinc-400">
              <span className="text-amber-400">●</span> Speichern…
            </span>
          )}
          <Button
            type="button"
            className="rounded-xl bg-zinc-100 px-4 py-1.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-white"
            onClick={() => setShowOfferModal(true)}
          >
            Angebot erstellen
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <MoreHorizontal size={18} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-zinc-800 bg-zinc-900">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  setProjectSelectId(calculation.project_id ?? "none");
                  setShowProjectModal(true);
                }}
              >
                Mit Projekt verknüpfen
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  setNotesDraft(calculation.notes ?? "");
                  setShowNotesModal(true);
                }}
              >
                Notizen bearbeiten
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-amber-400 focus:text-amber-300"
                onClick={async () => {
                  const ok = await patchCalculation({ status: "archiviert" });
                  if (ok) {
                    toast.success("Archiviert");
                    router.push("/kalkulation");
                  }
                }}
              >
                Archivieren
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {mounted ? (
      <div className="flex min-h-0 flex-1 flex-col">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={cn(
            "flex w-80 shrink-0 flex-col border-r border-zinc-800",
            "bg-zinc-900/50"
          )}
        >
          <p className="px-4 pb-2 pt-4 text-xs font-semibold uppercase tracking-widest text-zinc-600">
            Positionen
          </p>
          <div className="relative mx-3 mb-2">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              size={16}
              aria-hidden
            />
            <Input
              placeholder="Suchen…"
              className="h-9 rounded-xl border-zinc-700/50 bg-zinc-800/50 pl-9 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:ring-0"
              value={librarySearchInput}
              onChange={(e) => setLibrarySearchInput(e.target.value)}
            />
          </div>
          <div
            className={cn(
              "flex gap-1.5 overflow-x-auto px-3 pb-3",
              "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            )}
          >
            <button
              type="button"
              onClick={() => setLibraryTradeFilter("")}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs transition-colors",
                libraryTradeFilter === ""
                  ? "bg-zinc-600 text-zinc-100"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              )}
            >
              Alle
            </button>
            {tradeCategories.map((tc) => (
              <button
                key={tc.id}
                type="button"
                onClick={() => setLibraryTradeFilter(tc.id)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs transition-colors",
                  libraryTradeFilter === tc.id
                    ? "bg-zinc-600 text-zinc-100"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                )}
              >
                {tc.name}
              </button>
            ))}
          </div>
          <div className="px-4 pb-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400 transition-colors">
              <Checkbox
                checked={libraryIncludeGlobal}
                onCheckedChange={(c) => setLibraryIncludeGlobal(c === true)}
              />
              Globale Vorlagen
            </label>
          </div>
          <button
            type="button"
            onClick={() => setShowQuickAdd(true)}
            className="mx-3 mb-3 w-[calc(100%-1.5rem)] rounded-xl border border-dashed border-zinc-700 py-2 text-xs text-zinc-500 transition-colors hover:border-zinc-500 hover:text-zinc-300"
          >
            ＋ Eigene Position anlegen
          </button>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto pb-4">
            {libraryFiltered.map((item) => (
              <DraggableLibraryItem
                key={item.id}
                item={item}
                onAdd={(it) => void addFromLibrary(it)}
              />
            ))}
            {libraryFiltered.length === 0 && (
              <p className="px-4 text-xs text-zinc-500">Keine Einträge.</p>
            )}
            </div>
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {sortedPositions.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-8 text-center">
              <div className="text-4xl text-zinc-600">📋</div>
              <p className="text-sm font-medium text-zinc-400">
                Noch keine Positionen
              </p>
              <p className="max-w-xs text-xs text-zinc-600">
                Ziehe Positionen aus der Bibliothek links oder lege eine neue an
              </p>
              <button
                type="button"
                onClick={() => setShowQuickAdd(true)}
                className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500"
              >
                ＋ Erste Position hinzufügen
              </button>
            </div>
          ) : (
            groupOrder.map((gkey) => {
              const list = groupMap.get(gkey) ?? [];
              const tcName =
                gkey === "ohne"
                  ? "Ohne Gewerk"
                  : list[0]?.trade_categories?.name ??
                    tradeCategories.find((t) => t.id === gkey)?.name ??
                    gkey;
              const dotClass = tradeCategoryDotClass(tcName);
              let gruppenSumme = 0;
              for (const p of list) {
                const idx = sortedPositions.findIndex((x) => x.id === p.id);
                gruppenSumme += lineAmountFromPosition(p, sortedPositions, idx);
              }
              return (
                <section key={gkey}>
                  <div
                    className={cn(
                      "sticky top-0 z-10 flex items-center gap-2 border-b border-zinc-800/60",
                      "bg-zinc-950/95 px-4 py-2 backdrop-blur-sm"
                    )}
                  >
                    <div
                      className={cn("h-2 w-2 shrink-0 rounded-full", dotClass)}
                      aria-hidden
                    />
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      {tcName}
                    </span>
                    <span className="ml-1 text-xs text-zinc-600">
                      {list.length} Position{list.length === 1 ? "" : "en"}
                    </span>
                    <span className="ml-auto text-xs font-medium text-zinc-300">
                      Σ {formatEuro(gruppenSumme)}
                    </span>
                  </div>
                  <SortableContext
                    items={list.map((p) => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {list.map((pos) => {
                      const index = sortedPositions.findIndex((x) => x.id === pos.id);
                      const la = lineAmountFromPosition(pos, sortedPositions, index);
                      return (
                        <SortablePositionRow
                          key={pos.id}
                          pos={pos}
                          lineAmount={la}
                          onUpdateTitle={(pid, title) => updatePosition(pid, { title })}
                          onOpenDetail={setActivePositionId}
                          onDelete={(pid) => void deletePosition(pid)}
                          editingTitleId={editingTitleId}
                          setEditingTitleId={setEditingTitleId}
                          draftTitle={draftTitle}
                          setDraftTitle={setDraftTitle}
                        />
                      );
                    })}
                  </SortableContext>
                </section>
              );
            })
          )}
          </div>
        </main>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeLibraryItem && (
          <div className="w-72 rounded-xl border border-zinc-600 bg-zinc-800 p-3 opacity-90 shadow-2xl">
            <p className="text-sm text-zinc-200">{activeLibraryItem.name}</p>
          </div>
        )}
        {activeDragPosition && (
          <div className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 opacity-90 shadow-2xl">
            <p className="text-sm text-zinc-200">{activeDragPosition.title}</p>
          </div>
        )}
      </DragOverlay>
      </DndContext>
      </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <div className="w-80 shrink-0 border-r border-zinc-800 bg-zinc-900/50" />
          <div className="flex flex-1 items-center justify-center">
            <div className="text-sm text-zinc-500">Wird geladen…</div>
          </div>
        </div>
      )}

      <footer
        className={cn(
          "flex-none border-t border-zinc-800 bg-zinc-900/80 px-5 py-3 backdrop-blur",
          "grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8"
        )}
      >
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-xs text-zinc-500">Arbeit</span>
            <span className="text-xs text-zinc-400">
              {formatEuro(summary.arbeitskosten)}{" "}
              <span className="text-zinc-600">
                ({summary.arbeitsStundenGesamt.toFixed(1)} h)
              </span>
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-xs text-zinc-500">Material (netto)</span>
            <span className="text-xs text-zinc-400">{formatEuro(summary.materialNetto)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-xs text-zinc-500">Pauschalen</span>
            <span className="text-xs text-zinc-400">{formatEuro(summary.pauschalen)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-xs text-zinc-500">Fremdleistung</span>
            <span className="text-xs text-zinc-400">{formatEuro(summary.fremdleistung)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-xs text-zinc-500">Nachlässe</span>
            <span className="text-xs text-zinc-400">-{formatEuro(summary.nachlaesse)}</span>
          </div>
          <div className="my-2 border-t border-zinc-700/50" />
          <div className="flex justify-between gap-4 text-sm font-medium text-zinc-200">
            <span>Netto gesamt</span>
            <span>{formatEuro(summary.nettoGesamt)}</span>
          </div>
        </div>
        <div className="flex flex-col items-end justify-center gap-1">
          <div className="text-sm text-zinc-400">
            Netto {formatEuro(summary.nettoGesamt)}
          </div>
          <div className="text-sm text-zinc-400">MwSt 19% {formatEuro(summary.mwst)}</div>
          <div className="text-right">
            <span className="block text-xs text-zinc-500">Brutto</span>
            <span className="text-xl font-bold text-zinc-50">
              {formatEuro(summary.bruttoGesamt)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Badge className={cn("text-xs", margeBadgeClass)}>
              Marge {margePct.toFixed(1)}%
            </Badge>
            {targetPct != null && (
              <span className="text-xs text-zinc-500">Ziel {targetPct}%</span>
            )}
          </div>
        </div>
      </footer>

      <OfferModal
        open={showOfferModal}
        calculationId={id}
        calculationTitle={calculation?.title ?? ""}
        nettoGesamt={summary.nettoGesamt}
        bruttoGesamt={summary.bruttoGesamt}
        onClose={() => setShowOfferModal(false)}
      />

      <PositionDetailModal
        positionId={activePositionId}
        calculationId={id}
        positions={positions}
        tradeCategories={tradeCategories}
        onClose={() => setActivePositionId(null)}
        onUpdate={(pid, updates) => updatePosition(pid, updates)}
        onSave={() => {}}
      />

      <Dialog
        open={showQuickAdd}
        onOpenChange={(o) => {
          setShowQuickAdd(o);
          if (!o) {
            setQuickAddTitel("");
            setQuickAddTyp("arbeit");
            setQuickAddGewerk("");
          }
        }}
      >
        <DialogContent className="max-w-sm border-zinc-800 bg-zinc-900 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Position anlegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label className="text-zinc-400">Titel *</Label>
              <Input
                className="border-zinc-700 bg-zinc-950"
                value={quickAddTitel}
                onChange={(e) => setQuickAddTitel(e.target.value)}
                placeholder="Bezeichnung"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">Typ</Label>
              <Select
                value={quickAddTyp}
                onValueChange={(v) => setQuickAddTyp(v as PositionType)}
              >
                <SelectTrigger className="border-zinc-700 bg-zinc-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-zinc-800 bg-zinc-900">
                  <SelectItem value="arbeit">arbeit</SelectItem>
                  <SelectItem value="material">material</SelectItem>
                  <SelectItem value="pauschal">pauschal</SelectItem>
                  <SelectItem value="fremdleistung">fremdleistung</SelectItem>
                  <SelectItem value="nachlass">nachlass</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">Gewerk (optional)</Label>
              <Select
                value={quickAddGewerk === "" ? "" : quickAddGewerk}
                onValueChange={(v) => setQuickAddGewerk(v ?? "")}
              >
                <SelectTrigger className="border-zinc-700 bg-zinc-950">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent className="border-zinc-800 bg-zinc-900">
                  <SelectItem value="">—</SelectItem>
                  {tradeCategories.map((tc) => (
                    <SelectItem key={tc.id} value={tc.id}>
                      {tc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowQuickAdd(false)}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              disabled={quickAddLaden}
              onClick={() => void quickAddPosition()}
            >
              {quickAddLaden ? "…" : "Hinzufügen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showProjectModal} onOpenChange={setShowProjectModal}>
        <DialogContent className="border-zinc-800 bg-zinc-900 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Mit Projekt verknüpfen</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-zinc-400">Projekt</Label>
            <Select
              value={projectSelectId}
              onValueChange={(v) => setProjectSelectId(v ?? "none")}
            >
              <SelectTrigger className="border-zinc-700 bg-zinc-950">
                <SelectValue placeholder="Kein Projekt" />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-zinc-900">
                <SelectItem value="none">Kein Projekt</SelectItem>
                {projektOptionen.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setShowProjectModal(false)}>
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={async () => {
                const ok = await patchCalculation({
                  project_id: projectSelectId === "none" ? null : projectSelectId,
                });
                if (ok) {
                  toast.success("Projekt gespeichert");
                  setShowProjectModal(false);
                }
              }}
            >
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNotesModal} onOpenChange={setShowNotesModal}>
        <DialogContent className="border-zinc-800 bg-zinc-900 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Notizen</DialogTitle>
          </DialogHeader>
          <Textarea
            className="min-h-[160px] border-zinc-700 bg-zinc-950"
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setShowNotesModal(false)}>
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={async () => {
                const ok = await patchCalculation({ notes: notesDraft || null });
                if (ok) {
                  toast.success("Notizen gespeichert");
                  setShowNotesModal(false);
                }
              }}
            >
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
