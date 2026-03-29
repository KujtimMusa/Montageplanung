"use client"

import type { ReactNode } from "react"

export function StammdatenFormField({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </span>
      {children}
      {hint ? <p className="text-xs text-zinc-600">{hint}</p> : null}
    </div>
  )
}
