"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Notfall melden — vollständige Logik Phase 3.
 */
export function NotfallModal() {
  return (
    <Dialog>
      <DialogTrigger
        render={<Button variant="destructive" size="sm" type="button" />}
      >
        Notfall melden
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notfall</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Inhalt folgt in Phase 3.</p>
      </DialogContent>
    </Dialog>
  );
}
