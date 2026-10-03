import { useEffect, useState } from "react";
import { Calculator, Loader2, Play, CheckCircle2, Coins, Trophy, Star } from "lucide-react";
import { PlatformShell } from "@/components/PlatformShell";
import { Button } from "@/components/ui/button";
import { useAntiInspect } from "@/hooks/useAntiInspect";
import {
  MatificAccount,
  MatificCampaign,
  matificAccount,
  matificComplete,
  matificList,
} from "@/lib/openfuture";
import { toast } from "sonner";

interface Episode {
  slug: string;
  assignmentId: string;
  campaignId: string;
  dueDate?: string;
}

const Matific = () => {
  useAntiInspect();
  const [account, setAccount] = useState<MatificAccount | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState<Record<string, boolean>>({});

  const load = async (fresh = false) => {
    setLoading(true);
    try {
      const [acc, list] = await Promise.all([
        matificAccount().catch(() => null),
        matificList(fresh),
      ]);
      if (acc?.data) setAccount(acc.data);

      const campaigns: MatificCampaign[] = list?.raw?.Campaigns ?? [];
      const eps: Episode[] = [];
      campaigns.forEach((c) =>
        (c.Episodes || []).forEach((e) =>
          eps.push({
            slug: e.Slug,
            assignmentId: e.AssignmentId,
            campaignId: c.Id,
            dueDate: e.DueDate,
          }),
        ),
      );
      setEpisodes(eps);
    } catch (e: any) {
      toast.error(e.message || "Não foi possível carregar o Matific");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runAll = async () => {
    const pending = episodes.filter((e) => !done[e.slug]);
    if (!pending.length) return;
    setRunning(true);
    try {
      const res = await matificComplete(pending);
      const results = res?.data?.results ?? [];
      const map = { ...done };
      results.forEach((r: any) => { if (r.ok) map[r.slug] = true; });
      setDone(map);
      toast.success(`${results.filter((r: any) => r.ok).length} atividade(s) concluída(s)`);
      matificAccount().then((a) => a?.data && setAccount(a.data)).catch(() => {});
    } catch (e: any) {
      toast.error(e.message || "Falha ao concluir as atividades");
    } finally {
      setRunning(false);
    }
  };

  const runOne = async (ep: Episode) => {
    setRunning(true);
    try {
      await matificComplete([ep]);
      setDone((d) => ({ ...d, [ep.slug]: true }));
      toast.success("Atividade concluída");
    } catch (e: any) {
      toast.error(e.message || "Falha ao concluir");
    } finally {
      setRunning(false);
    }
  };

  return (
    <PlatformShell
      name="Matific"
      tagline="Conclui automaticamente as atividades de matemática do Matific."
      icon={Calculator}
      status="available"
    >
      <div className="space-y-5">
        {account && (
          <div className="grid grid-cols-3 gap-3">
            <Stat icon={Coins} label="Moedas" value={account.coins} />
            <Stat icon={Star} label="XP" value={account.xp} />
            <Stat icon={Trophy} label="Ranking" value={`#${account.rank}`} />
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div>
              <h2 className="font-bold font-bricolage text-lg">Atividades da escola</h2>
              <p className="text-xs text-muted-foreground">
                {loading ? "Carregando..." : `${episodes.length} atividade(s) encontradas`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => load(true)} disabled={loading || running}>
                Atualizar
              </Button>
              <Button
                onClick={runAll}
                disabled={loading || running || !episodes.length}
                className="bg-gradient-brand text-primary-foreground font-semibold glow-primary"
              >
                {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Concluir todas
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Buscando atividades...
            </div>
          ) : episodes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma atividade pendente no Matific.
            </p>
          ) : (
            <div className="space-y-2 max-h-[28rem] overflow-auto">
              {episodes.map((ep) => (
                <div
                  key={ep.slug + ep.assignmentId}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-background/50"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <img
                      src={`https://static1.matific.com/v1/346x242/${ep.slug}.png`}
                      alt=""
                      loading="lazy"
                      onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                      className="w-16 h-11 object-cover rounded-md shrink-0 bg-muted"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{prettySlug(ep.slug)}</div>
                      {ep.dueDate && (
                        <div className="text-xs text-muted-foreground">Entrega: {ep.dueDate}</div>
                      )}
                    </div>
                  </div>
                  {done[ep.slug] ? (
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  ) : (
                    <Button size="sm" variant="outline" disabled={running} onClick={() => runOne(ep)}>
                      Concluir
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PlatformShell>
  );
};

const prettySlug = (slug: string) =>
  slug
    .replace(/^Worksheet/, "")
    .replace(/Main$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim() || slug;

const Stat = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) => (
  <div className="rounded-2xl border border-border bg-card p-4">
    <Icon className="w-4 h-4 text-primary mb-2" />
    <div className="text-2xl font-bold font-bricolage text-gradient">{value}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </div>
);

export default Matific;
