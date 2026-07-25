import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LogOut, ShieldAlert, Ban, Home, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskModal } from "@/components/TaskModal";
import { NotificationContainer, NotificationData } from "@/components/Notification";
import { BannedScreen } from "@/components/BannedScreen";
import { WarningScreen } from "@/components/WarningScreen";
import { fetchUserTasks, processTasks, Task } from "@/lib/api";
import { useAntiInspect } from "@/hooks/useAntiInspect";
import { useBanCheck } from "@/hooks/useBanCheck";
import { useWarningCheck } from "@/hooks/useWarningCheck";
import { logger } from "@/lib/logger";
import { useSession } from "@/contexts/SessionContext";

const Index = () => {
  const navigate = useNavigate();
  const { session, logout } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const { banInfo, checkBan, clearBanInfo } = useBanCheck();
  const { warningInfo, checkWarning, acknowledgeWarning, clearWarningInfo } = useWarningCheck();

  const { showWarning, isBanned, dismissWarning } = useAntiInspect({
    ra: session?.ra || "",
    studentName: session?.nick,
  });

  const addNotification = useCallback((message: string, type: "info" | "success" | "error" = "info") => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleSearch = async (filter: "pending" | "expired") => {
    if (!session) return;
    if (isLoading) return;
    setIsLoading(true);
    try {
      const ban = await checkBan(session.ra);
      if (ban.isBanned) return;
      await checkWarning(session.ra);
      addNotification("BUSCANDO LIÇÕES...", "info");
      const fetched = await fetchUserTasks(session.auth_token, session.nick, filter);
      if (fetched.length > 0) {
        setTasks(fetched);
        setIsModalOpen(true);
        addNotification(`${fetched.length} LIÇÕES ENCONTRADAS`, "success");
      } else {
        addNotification("NENHUMA ATIVIDADE ENCONTRADA", "info");
      }
    } catch (e) {
      console.error(e);
      addNotification("ERRO AO BUSCAR ATIVIDADES", "error");
      await logger.logError(session.ra, session.nick, "Erro ao buscar atividades");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTasks = async (selected: Task[], isDraft: boolean, minTime: number, maxTime: number) => {
    setIsModalOpen(false);
    if (!session || selected.length === 0) return;
    addNotification(`${selected.length} ATIVIDADES ENVIADAS`, "info");
    const result = await processTasks(
      selected,
      isDraft,
      minTime,
      maxTime,
      async (message, type) => {
        addNotification(message, type);
        const title = message.includes("'") ? message.split("'")[1] : "";
        if (type === "success") await logger.logTaskCompleted(session.ra, session.nick, "", title);
        else if (type === "error") await logger.logTaskFailed(session.ra, session.nick, "", title, message);
      },
      session.ra,
    );
    if (result.success > 0) addNotification(`${result.success} SUCESSO`, "success");
    if (result.error > 0) addNotification(`${result.error} FALHARAM`, "error");
  };

  if (isBanned) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 select-none">
        <Ban className="w-24 h-24 text-destructive mx-auto mb-6" />
        <h1 className="text-4xl font-extrabold text-destructive mb-4">ACESSO BLOQUEADO</h1>
        <p className="text-muted-foreground">Dispositivo bloqueado.</p>
      </div>
    );
  }

  if (banInfo?.isBanned) {
    return (
      <BannedScreen
        reason={banInfo.reason || "Violação"}
        bannedAt={banInfo.bannedAt}
        onBack={() => { clearBanInfo(); logout(); navigate("/login"); }}
      />
    );
  }

  if (warningInfo?.hasWarning && !warningInfo.acknowledged) {
    return (
      <WarningScreen
        reason={warningInfo.reason || "Aviso"}
        warnedAt={warningInfo.warnedAt}
        onAcknowledge={async () => await acknowledgeWarning(warningInfo.id, session?.ra || "")}
        onBack={() => { clearWarningInfo(); logout(); navigate("/login"); }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-[120px] pointer-events-none" />

      {showWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm px-4">
          <div className="max-w-xl w-full text-center p-8 rounded-2xl border-2 border-destructive/60 bg-destructive/10">
            <ShieldAlert className="w-20 h-20 text-destructive mx-auto mb-6" />
            <h2 className="text-3xl font-extrabold text-destructive mb-4">⚠️ AVISO DE SEGURANÇA</h2>
            <p className="text-muted-foreground mb-6">Não tente inspecionar o código.</p>
            <button onClick={dismissWarning} className="px-8 py-3 rounded-lg bg-destructive text-white font-semibold">
              Entendi
            </button>
          </div>
        </div>
      )}

      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
      <TaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} tasks={tasks} onStartTasks={handleStartTasks} />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition text-sm"
          >
            <Home className="w-4 h-4" /> Hub
          </button>
          <div className="flex items-center gap-2">
            {session && <span className="text-xs text-muted-foreground hidden sm:inline">{session.nick}</span>}
            <button
              onClick={() => { logout(); navigate("/login"); }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-destructive/40 text-destructive/80 hover:bg-destructive/10 transition text-sm"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-border bg-card overflow-hidden mb-6"
        >
          <div className="relative p-6 md:p-8">
            <div className="absolute inset-0 bg-gradient-brand opacity-10 pointer-events-none" />
            <div className="relative flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-brand flex items-center justify-center glow-primary shrink-0">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold font-bricolage mb-1">TarefaSP</h1>
                <p className="text-muted-foreground text-sm">
                  Resolve automaticamente as tarefas da Sala do Futuro para <b className="text-foreground">{session?.nick}</b>.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <Button
            onClick={() => handleSearch("pending")}
            disabled={isLoading}
            className="w-full bg-gradient-brand text-white font-semibold py-6 glow-primary"
          >
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
            Buscar Atividades Pendentes
          </Button>
          <Button
            onClick={() => handleSearch("expired")}
            disabled={isLoading}
            variant="outline"
            className="w-full py-6"
          >
            Buscar Atividades Expiradas
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
