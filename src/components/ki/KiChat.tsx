"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  AlertTriangle,
  BarChart3,
  CalendarOff,
  FileText,
  FolderOpen,
  Loader2,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const SCHNELLZUGRIFF_FRAGEN = [
  { text: "Wer ist nächste Woche verfügbar?", Icon: Users },
  { text: "Zeig alle Konflikte diese Woche", Icon: AlertTriangle },
  { text: "Welche Projekte sind noch ungeplant?", Icon: FolderOpen },
  { text: "Wer hat die meisten Einsätze diesen Monat?", Icon: BarChart3 },
  { text: "Gibt es Abwesenheiten nächste Woche?", Icon: CalendarOff },
  { text: "Erstelle einen Wochenbericht", Icon: FileText },
] as const;

function textAusNachricht(m: UIMessage): string {
  return (
    m.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("") ?? ""
  );
}

function formatZeit(d: Date): string {
  return d.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RenderKiText({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (line.startsWith("⚠️")) {
          return (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg border border-amber-900/30 bg-amber-950/30 px-3 py-2"
            >
              <span className="text-xs leading-relaxed text-amber-300">
                {line}
              </span>
            </div>
          );
        }
        if (line.startsWith("💡")) {
          return (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg border border-violet-900/30 bg-violet-950/30 px-3 py-2"
            >
              <span className="text-xs leading-relaxed text-violet-300">
                {line}
              </span>
            </div>
          );
        }
        if (line.startsWith("⚡")) {
          return (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg border border-emerald-900/30 bg-emerald-950/30 px-3 py-2"
            >
              <span className="text-xs leading-relaxed text-emerald-300">
                {line}
              </span>
            </div>
          );
        }
        if (line.startsWith("|")) {
          return (
            <p key={i} className="font-mono text-xs leading-relaxed text-zinc-400">
              {line}
            </p>
          );
        }
        if (!line.trim()) return <div key={i} className="h-1" />;
        return (
          <p key={i} className="text-sm leading-relaxed text-zinc-200">
            {line}
          </p>
        );
      })}
    </div>
  );
}

export function KiChat() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [eingabe, setEingabe] = useState("");

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/agents/chat" }),
    onError: (err) => {
      toast.error(err.message ?? "Chat-Fehler");
    },
  });

  const kiSchreibt = status === "streaming" || status === "submitted";

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, kiSchreibt]);

  function frageAbsenden(text: string) {
    const t = text.trim();
    if (!t || kiSchreibt) return;
    void sendMessage({ text: t });
    setEingabe("");
  }

  return (
    <div className="grid min-h-[480px] flex-1 gap-4 lg:grid-cols-[minmax(0,208px)_1fr]">
      <div className="w-full shrink-0 lg:w-52">
        <p className="mb-3 px-1 text-xs font-semibold uppercase text-zinc-500">
          Schnellzugriff
        </p>
        {SCHNELLZUGRIFF_FRAGEN.map((frage) => (
          <button
            key={frage.text}
            type="button"
            onClick={() => frageAbsenden(frage.text)}
            disabled={kiSchreibt}
            className="group mb-2 w-full rounded-xl border border-zinc-800 bg-zinc-900/50 p-2.5 text-left transition-all hover:border-violet-700/50 hover:bg-violet-900/10"
          >
            <div className="flex items-start gap-2">
              <frage.Icon
                size={13}
                className="mt-0.5 shrink-0 text-violet-400"
              />
              <span className="text-xs leading-relaxed text-zinc-300 group-hover:text-zinc-100">
                {frage.text}
              </span>
            </div>
          </button>
        ))}
        <Separator className="my-3 bg-zinc-800" />
        <p className="px-1 text-[10px] text-zinc-600">
          Die KI hat Zugriff auf:
        </p>
        {[
          "Mitarbeiter & Teams",
          "Einsätze & Projekte",
          "Abwesenheiten",
          "Konflikte",
        ].map((k) => (
          <div key={k} className="flex items-center gap-1.5 px-1 py-0.5">
            <div className="size-1 rounded-full bg-violet-500" />
            <span className="text-[10px] text-zinc-600">{k}</span>
          </div>
        ))}
      </div>

      <div className="flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/30 lg:min-h-[560px]">
        <ScrollArea ref={scrollRef} className="flex-1 p-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-6 px-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-600/20 to-violet-800/10">
                <Sparkles size={20} className="text-violet-400" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold tracking-tight text-zinc-200">
                  Wie kann ich helfen?
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Ich kenne alle Mitarbeiter, Einsätze und Konflikte
                </p>
              </div>

              <div className="w-full max-w-lg space-y-3">
                <div>
                  <p className="mb-2 pl-1 text-[10px] uppercase tracking-wider text-zinc-600">
                    Planung
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Wer ist nächste Woche verfügbar?",
                      "Welche Projekte sind noch ungeplant?",
                      "Wer hat die meisten Einsätze diesen Monat?",
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => void sendMessage({ text: q })}
                        className="rounded-full border border-zinc-700/40 bg-zinc-800/80 px-3 py-1.5 text-xs text-zinc-400 transition-all hover:border-zinc-600 hover:text-zinc-200"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 pl-1 text-[10px] uppercase tracking-wider text-zinc-600">
                    Abwesenheiten
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Gibt es Abwesenheiten nächste Woche?",
                      "Wer ist heute krank?",
                      "Zeig alle offenen Urlaubsanfragen",
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => void sendMessage({ text: q })}
                        className="rounded-full border border-zinc-700/40 bg-zinc-800/80 px-3 py-1.5 text-xs text-zinc-400 transition-all hover:border-zinc-600 hover:text-zinc-200"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 pl-1 text-[10px] uppercase tracking-wider text-zinc-600">
                    Berichte
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Erstelle einen Wochenbericht",
                      "Zeig alle Konflikte diese Woche",
                      "Wie ist die Kapazität nächsten Monat?",
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => void sendMessage({ text: q })}
                        className="rounded-full border border-zinc-700/40 bg-zinc-800/80 px-3 py-1.5 text-xs text-zinc-400 transition-all hover:border-zinc-600 hover:text-zinc-200"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                {[
                  "Mitarbeiter & Teams",
                  "Einsätze & Projekte",
                  "Abwesenheiten",
                  "Konflikte",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-1">
                    <div className="h-1 w-1 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-zinc-600">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {messages.map((n) => {
            const isUser = n.role === "user";
            const text = textAusNachricht(n);
            const ts = new Date();
            return (
              <div
                key={n.id}
                className={cn(
                  "mb-4 flex gap-3",
                  isUser ? "justify-end" : "justify-start"
                )}
              >
                {!isUser && (
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-500/20">
                    <Sparkles size={13} className="text-violet-400" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2.5",
                    isUser
                      ? "rounded-br-sm bg-violet-600 text-white"
                      : "rounded-bl-sm bg-zinc-800 text-zinc-200"
                  )}
                >
                  {isUser ? (
                    <p className="text-sm leading-relaxed">{text}</p>
                  ) : (
                    <RenderKiText text={text} />
                  )}
                  <p
                    className={cn(
                      "mt-1 text-right text-[10px] opacity-40",
                      isUser ? "text-white" : "text-zinc-400"
                    )}
                  >
                    {formatZeit(ts)}
                  </p>
                </div>
                {isUser && (
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-bold text-zinc-400">
                    Du
                  </div>
                )}
              </div>
            );
          })}

          {kiSchreibt && (
            <div className="mb-4 flex gap-3">
              <div className="flex size-7 items-center justify-center rounded-full bg-violet-500/20">
                <Sparkles
                  size={13}
                  className="animate-pulse text-violet-400"
                />
              </div>
              <div className="rounded-2xl rounded-bl-sm bg-zinc-800 px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="size-1.5 animate-bounce rounded-full bg-zinc-500"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        <div className="border-t border-zinc-800 p-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={eingabe}
              onChange={(e) => setEingabe(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  frageAbsenden(eingabe);
                }
              }}
              placeholder="Frage stellen… (Enter zum Senden)"
              rows={1}
              className="min-h-[40px] max-h-[120px] flex-1 resize-none rounded-xl border-zinc-700 bg-zinc-900 text-sm focus:border-violet-600"
            />
            <Button
              type="button"
              size="icon"
              className="size-10 shrink-0 rounded-xl bg-violet-600 hover:bg-violet-500"
              disabled={!eingabe.trim() || kiSchreibt}
              onClick={() => frageAbsenden(eingabe)}
              aria-label="Senden"
            >
              {kiSchreibt ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </Button>
          </div>
          <p className="mt-1.5 px-1 text-[10px] text-zinc-700">
            Enter = Senden · Shift+Enter = Neue Zeile · Die KI kennt deine Daten
          </p>
        </div>
      </div>
    </div>
  );
}
