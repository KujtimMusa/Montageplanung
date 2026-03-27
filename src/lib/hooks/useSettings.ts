"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Liest und schreibt Einträge in `public.settings` (Key/Value).
 */
export function useSettings() {
  const [loading, setLoading] = useState(false);

  const getSetting = useCallback(async (key: string): Promise<string | null> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();

    if (error) {
      console.error("[useSettings] getSetting", key, error.message);
      return null;
    }
    return data?.value ?? null;
  }, []);

  const updateSetting = useCallback(
    async (key: string, value: string | null): Promise<boolean> => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { error } = await supabase.from("settings").upsert(
          {
            key,
            value,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );
        if (error) {
          console.error("[useSettings] updateSetting", key, error.message);
          return false;
        }
        return true;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { getSetting, updateSetting, loading };
}
