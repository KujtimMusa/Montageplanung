"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type LogoutButtonProps = {
  /** z. B. volle Breite in der Sidebar */
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  /** Nur Icon (z. B. Mobile-Nav) */
  kompakt?: boolean;
};

/**
 * Supabase-Abmeldung und Redirect zur Startseite.
 */
export function LogoutButton({
  className,
  variant = "ghost",
  size = "default",
  kompakt = false,
}: LogoutButtonProps) {
  const router = useRouter();

  async function abmelden() {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(
          error.message || "Abmelden ist fehlgeschlagen. Bitte erneut versuchen."
        );
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Abmelden ist fehlgeschlagen. Bitte erneut versuchen.");
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      title="Abmelden"
      aria-label="Abmelden"
      className={cn(kompakt ? "justify-center px-2" : "justify-start gap-2", className)}
      onClick={() => void abmelden()}
    >
      <LogOut className="size-4 shrink-0" aria-hidden />
      {!kompakt && "Abmelden"}
    </Button>
  );
}
