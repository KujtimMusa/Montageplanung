"use client";

import { forwardRef, useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = Omit<React.ComponentProps<typeof Input>, "type"> & {
  inputClassName?: string;
};

/**
 * Passwort-Feld mit Sichtbarkeitstoggle — kein Klartext in der Konsole.
 */
export const SecretInput = forwardRef<HTMLInputElement, Props>(function SecretInput(
  { className, inputClassName, ...props },
  ref
) {
  const [sichtbar, setSichtbar] = useState(false);

  return (
    <div className={cn("relative flex gap-1", className)}>
      <Input
        ref={ref}
        type={sichtbar ? "text" : "password"}
        autoComplete="off"
        className={cn("pr-10", inputClassName)}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground"
        onClick={() => setSichtbar((v) => !v)}
        aria-label={sichtbar ? "Eingabe verbergen" : "Eingabe anzeigen"}
      >
        {sichtbar ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
      </Button>
    </div>
  );
});
