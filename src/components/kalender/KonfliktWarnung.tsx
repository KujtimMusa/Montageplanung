"use client";

/**
 * Konflikt-Hinweis im Kalender — Phase 2.
 */
export function KonfliktWarnung({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {text}
    </p>
  );
}
