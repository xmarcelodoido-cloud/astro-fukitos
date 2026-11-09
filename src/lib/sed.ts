import { supabase } from "@/integrations/supabase/client";

export type SedAction = "faltas" | "frequencia" | "agenda" | "boletim" | "notas";

export async function sedRequest<T = any[]>(action: SedAction, extra: Record<string, string> = {}): Promise<T> {
  const raw = sessionStorage.getItem("astrokitos_session");
  const s = raw ? JSON.parse(raw) : null;
  const { data, error } = await supabase.functions.invoke("proxy-sed", {
    body: { action, token: s?.sed_token, codigoAluno: s?.codigoAluno, ...extra },
  });
  if (error) throw new Error("Não foi possível falar com a Sala do Futuro.");
  if (!data?.success) throw new Error(data?.error || "Erro desconhecido");
  return data.data as T;
}

export const asList = (d: any): any[] => (Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : d ? [d] : []);
export const pick = (o: any, ...keys: string[]) => { for (const k of keys) if (o?.[k] != null && o[k] !== "") return o[k]; return null; };

export function weekRange() {
  const now = new Date(); const day = now.getDay() || 7;
  const mon = new Date(now); mon.setDate(now.getDate() - day + 1);
  const end = new Date(mon); end.setDate(mon.getDate() + 13);
  const f = (d: Date) => d.toISOString().slice(0, 10);
  return { inicio: `${f(mon)}T00:00:00`, fim: `${f(end)}T23:59:59` };
}
