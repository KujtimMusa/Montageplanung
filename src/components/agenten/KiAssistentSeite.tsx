"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Msg = { rolle: "user" | "assistant"; text: string };

const schnellfragen = [
  "Wer ist nächste Woche verfügbar?",
  "Plan ein Team für [Projekt]",
  "Zeig alle Konflikte diese Woche",
  "Wer hat die meisten Einsätze diesen Monat?",
];

export function KiAssistentSeite() {
  const [eingabe, setEingabe] = useState("");
  const [verlauf, setVerlauf] = useState<Msg[]>([]);
  const [lädt, setLädt] = useState(false);

  async function senden(text?: string) {
    const t = (text ?? eingabe).trim();
    if (!t || lädt) return;
    setEingabe("");
    setVerlauf((v) => [...v, { rolle: "user", text: t }]);
    setLädt(true);
    try {
      const res = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: t }),
      });
      const data = (await res.json()) as {
        antwort?: string;
        fehler?: string;
      };
      if (!res.ok) {
        throw new Error(data.fehler ?? "Anfrage fehlgeschlagen.");
      }
      setVerlauf((v) => [
        ...v,
        { rolle: "assistant", text: data.antwort ?? "(Keine Antwort)" },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Chat fehlgeschlagen.";
      toast.error(msg);
      setVerlauf((v) => [
        ...v,
        {
          rolle: "assistant",
          text: "Die Anfrage konnte nicht bearbeitet werden.",
        },
      ]);
    } finally {
      setLädt(false);
    }
  }

  return (
    <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,220px)_1fr]">
      <Card className="h-fit border-zinc-800 bg-zinc-900">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
            <Sparkles className="size-4 text-indigo-400" />
            Schnellzugriff
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {schnellfragen.map((q) => (
            <Button
              key={q}
              type="button"
              variant="secondary"
              className="h-auto justify-start whitespace-normal border-zinc-700 bg-zinc-800/80 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800"
              onClick={() => void senden(q)}
              disabled={lädt}
            >
              {q}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card className="flex min-h-[420px] flex-col border-zinc-800 bg-zinc-900 lg:min-h-[560px]">
        <CardHeader className="border-b border-zinc-800 pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-zinc-50">
            <MessageCircle className="size-5 text-blue-400" />
            Konversation
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3 pt-4">
          <div className="min-h-[240px] flex-1 space-y-3 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 text-sm">
            {verlauf.length === 0 ? (
              <p className="text-zinc-500">
                Stelle eine Frage oder nutze einen Schnellzugriff links. Die KI
                nutzt Mitarbeiter, Einsätze, Abwesenheiten und Konflikt-Hinweise
                aus der Datenbank.
              </p>
            ) : (
              verlauf.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[95%] rounded-xl px-3 py-2 leading-relaxed",
                    m.rolle === "user"
                      ? "ml-auto bg-blue-600/25 text-zinc-100"
                      : "mr-auto border border-zinc-700 bg-zinc-800/60 text-zinc-200"
                  )}
                >
                  {m.text}
                </div>
              ))
            )}
            {lädt && (
              <p className="text-xs text-zinc-500">Antwort wird erstellt…</p>
            )}
          </div>
          <div className="flex gap-2">
            <Textarea
              value={eingabe}
              onChange={(e) => setEingabe(e.target.value)}
              placeholder="Frage eingeben…"
              rows={3}
              className="border-zinc-700 bg-zinc-950 text-zinc-100 placeholder:text-zinc-600"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void senden();
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              className="h-auto min-h-[88px] shrink-0 bg-gradient-to-br from-blue-600 to-indigo-600"
              disabled={lädt}
              onClick={() => void senden()}
              aria-label="Senden"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
