"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Liest und schreibt Einträge in `public.settings` (Key/Value).
 */
export function useSettings() {
  const [loading, setLoading] = useState(false);

  const getOrgId = useCallback(async (): Promise<string | null> => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_my_org_id");
    if (error) {
      console.error("[useSettings] getOrgId", error.message);
      return null;
    }
    return (data as string | null) ?? null;
  }, []);

  const getSetting = useCallback(async (key: string): Promise<string | null> => {
    const supabase = createClient();
    const orgId = await getOrgId();
    if (!orgId) return null;
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("organization_id", orgId)
      .eq("key", key)
      .maybeSingle();

    if (error) {
      console.error("[useSettings] getSetting", key, error.message);
      return null;
    }
    return data?.value ?? null;
  }, [getOrgId]);

  const updateSetting = useCallback(
    async (key: string, value: string | null): Promise<boolean> => {
      setLoading(true);
      try {
        const supabase = createClient();
        const orgId = await getOrgId();
        if (!orgId) return false;
        const { error } = await supabase.from("settings").upsert(
          {
            key,
            organization_id: orgId,
            value,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,key" }
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
    [getOrgId]
  );

  return { getSetting, updateSetting, loading };
}
