"use client"

import { cn } from "@/lib/utils"
import { STAMMDATEN_FARBPALETTE } from "@/lib/stammdatenFarben"

export function StammdatenFarbpalette({
  gewaehlteFarbe,
  onWaehlen,
}: {
  gewaehlteFarbe: string
  onWaehlen: (hex: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {STAMMDATEN_FARBPALETTE.map((farbe) => (
        <button
          key={farbe}
          type="button"
          onClick={() => onWaehlen(farbe)}
          className={cn(
            "size-7 rounded-full border-2 transition-all outline-none focus-visible:ring-2 focus-visible:ring-zinc-500",
            gewaehlteFarbe.toLowerCase() === farbe.toLowerCase()
              ? "scale-110 border-white"
              : "border-transparent hover:scale-105"
          )}
          style={{ background: farbe }}
          aria-label={`Farbe ${farbe}`}
        />
      ))}
    </div>
  )
}
