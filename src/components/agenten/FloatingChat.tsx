"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";

type Msg = { rolle: "user" | "assistant"; text: string };

/**
 * Schwebender Chat-Button (unten rechts) — ruft /api/agents/chat auf.
 */
export function FloatingChat() {
  const [offen, setOffen] = useState(false);
  const [eingabe, setEingabe] = useState("");
  const [verlauf, setVerlauf] = useState<Msg[]>([]);
  const [lädt, setLädt] = useState(false);

  async function senden() {
    const t = eingabe.trim();
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
      const ct = res.headers.get("content-type") ?? "";
      if (ct.includes("application/json")) {
        const data = (await res.json()) as {
          antwort?: string;
          fehler?: string;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(
            data.fehler ?? data.error ?? "Anfrage fehlgeschlagen."
          );
        }
        setVerlauf((v) => [
          ...v,
          {
            rolle: "assistant",
            text: data.antwort ?? "(Keine Antwort)",
          },
        ]);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("Keine Antwort.");
      }
      setVerlauf((v) => [...v, { rolle: "assistant", text: "" }]);
      const decoder = new TextDecoder();
      let antwort = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        antwort += decoder.decode(value, { stream: true });
        setVerlauf((v) => {
          const copy = [...v];
          const last = copy[copy.length - 1];
          if (last?.rolle === "assistant") {
            copy[copy.length - 1] = { rolle: "assistant", text: antwort };
          }
          return copy;
        });
      }
      if (!antwort.trim()) {
        setVerlauf((v) => {
          const copy = [...v];
          if (copy[copy.length - 1]?.rolle === "assistant") {
            copy[copy.length - 1] = {
              rolle: "assistant",
              text: "(Keine Antwort)",
            };
          }
          return copy;
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Chat fehlgeschlagen.";
      toast.error(msg);
      setVerlauf((v) => [
        ...v,
        {
          rolle: "assistant",
          text: "Entschuldigung, die Anfrage konnte nicht bearbeitet werden.",
        },
      ]);
    } finally {
      setLädt(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="icon"
        className="fixed bottom-20 right-4 z-[60] size-12 rounded-full shadow-lg md:bottom-8"
        onClick={() => setOffen(true)}
        aria-label="Assistent öffnen"
      >
        <MessageCircle className="size-6" />
      </Button>

      <Sheet open={offen} onOpenChange={setOffen}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Assistent</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
            <div className="min-h-[200px] flex-1 space-y-3 overflow-y-auto rounded-md border p-3 text-sm">
              {verlauf.length === 0 ? (
                <p className="text-muted-foreground">
                  Stelle Fragen zu Mitarbeitern, Projekten oder Einsätzen — z. B.
                  „Wer hat nächste Woche frei?“
                </p>
              ) : (
                verlauf.map((m, i) => (
                  <div
                    key={i}
                    className={
                      m.rolle === "user"
                        ? "ml-4 rounded-lg bg-primary/10 p-2"
                        : "mr-4 rounded-lg bg-muted p-2"
                    }
                  >
                    {m.text}
                  </div>
                ))
              )}
              {lädt && (
                <p className="text-xs text-muted-foreground">Denkt nach…</p>
              )}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={eingabe}
                onChange={(e) => setEingabe(e.target.value)}
                placeholder="Frage eingeben…"
                rows={2}
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
                className="shrink-0"
                disabled={lädt}
                onClick={() => void senden()}
                aria-label="Senden"
              >
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
