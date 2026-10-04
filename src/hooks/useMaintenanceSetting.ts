import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MaintenanceState {
  active: boolean;
  expected_return: string;
}

export const useMaintenanceSetting = () => {
  const [state, setState] = useState<MaintenanceState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const fallback: MaintenanceState = { active: false, expected_return: "Prazo indeterminado" };
    try {
      const query = supabase
        .from("site_settings")
        .select("value")
        .eq("key", "maintenance")
        .maybeSingle();
      const timeout = new Promise<{ data: null }>((resolve) =>
        setTimeout(() => resolve({ data: null }), 4000),
      );
      const { data } = (await Promise.race([query, timeout])) as { data: { value: unknown } | null };
      setState((data?.value as MaintenanceState | undefined) ?? fallback);
    } catch {
      setState(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { state, loading, refresh };
};
