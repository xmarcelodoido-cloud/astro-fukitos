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
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "maintenance")
      .maybeSingle();
    const v = (data?.value as MaintenanceState | undefined) ?? {
      active: false,
      expected_return: "Prazo indeterminado",
    };
    setState(v);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  return { state, loading, refresh };
};
