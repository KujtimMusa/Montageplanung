"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogoutButton } from "@/components/auth/LogoutButton";

function initialen(name: string, email: string | undefined): string {
  if (name.trim()) {
    const teile = name.trim().split(/\s+/);
    if (teile.length >= 2) {
      return (teile[0]![0]! + teile[teile.length - 1]![0]!).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

/**
 * Avatar, Anzeigename (employees.name oder E-Mail) und Abmelden.
 */
export function SidebarAccount() {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      setEmail(user.email ?? undefined);

      const { data: row } = await supabase
        .from("employees")
        .select("name")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!cancelled && row?.name) setName(row.name);
      else if (!cancelled && user.email) setName(user.email.split("@")[0] ?? user.email);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const anzeige = name || email || "Angemeldet";

  return (
    <div className="flex items-center gap-3 border-t border-zinc-800 p-3">
      <Avatar size="sm" className="size-9 shrink-0 border border-zinc-700">
        <AvatarFallback className="bg-zinc-800 text-xs font-medium text-zinc-200">
          {initialen(name || anzeige, email)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100" title={anzeige}>
          {anzeige}
        </p>
        {email && (
          <p className="truncate text-xs text-zinc-500" title={email}>
            {email}
          </p>
        )}
      </div>
      <LogoutButton
        variant="ghost"
        size="sm"
        className="shrink-0 text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
      />
    </div>
  );
}
