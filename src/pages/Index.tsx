import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Shield, LogOut } from "lucide-react";
import logo from "@/assets/fukitos-logo.png";
import { LoginForm } from "@/components/LoginForm";
import { TaskModal } from "@/components/TaskModal";
import { DonationModal } from "@/components/DonationModal";
import { NotificationContainer, NotificationData } from "@/components/Notification";
import { BannedScreen } from "@/components/BannedScreen";
import { WarningScreen } from "@/components/WarningScreen";
import { SavedAccounts, saveAccount } from "@/components/SavedAccounts";
import { login, fetchUserTasks, processTasks, Task } from "@/lib/api";
import { useAntiInspect } from "@/hooks/useAntiInspect";
import { useBanCheck } from "@/hooks/useBanCheck";
import { useWarningCheck } from "@/hooks/useWarningCheck";
import { logger } from "@/lib/logger";
import { MAINTENANCE_CONFIG } from "@/config/maintenance";

const Index = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [userName, setUserName] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentRa, setCurrentRa] = useState<string>("");
  const [adminClickCount, setAdminClickCount] = useState(0);
  
  const { banInfo, checkBan, clearBanInfo } = useBanCheck();
  const { warningInfo, checkWarning, acknowledgeWarning, clearWarningInfo } = useWarningCheck();
  
  // Pass user info to anti-inspect hook for logging
  useAntiInspect({ ra: currentRa, studentName: userName || undefined });

  const handleLogoutAdmin = () => {
    localStorage.removeItem("fukitos_admin_unlocked");
    window.location.reload();
  };

  const addNotification = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const handleVerify = async (ra: string, password: string): Promise<string | null> => {
    try {
      // Check if RA is banned
      const banStatus = await checkBan(ra);
      if (banStatus.isBanned) {
        return null;
      }

      // Check if RA has unacknowledged warnings
      await checkWarning(ra);

      addNotification("VERIFICANDO CREDENCIAIS...", "info");
      const loginData = await login(ra, password);
      
      setUserName(loginData.nick);
      setAuthToken(loginData.auth_token);
      setCurrentRa(ra);
      
      // Log the login
      await logger.logLogin(ra, loginData.nick);
      
      // Save account for easy access
      saveAccount(ra, loginData.nick);
      
      addNotification(`BEM-VINDO, ${loginData.nick.toUpperCase()}!`, "success");
      return loginData.nick;
    } catch (error) {
      console.error(error);
      addNotification("RA OU SENHA INVÁLIDOS", "error");
      return null;
    }
  };

  const handleSelectAccount = (ra: string) => {
    setCurrentRa(ra);
  };

  const handleLogout = () => {
    setUserName(null);
    setAuthToken(null);
    setCurrentRa("");
    addNotification("VOCÊ SAIU DA CONTA", "info");
  };

  const handleSearchTasks = async (filter: 'pending' | 'expired', _ra: string, _password: string) => {
    if (isLoading) {
      addNotification("OPERAÇÃO EM ANDAMENTO", "info");
      return;
    }

    if (!authToken || !userName) {
      addNotification("FAÇA A VERIFICAÇÃO PRIMEIRO", "error");
      return;
    }

    setIsLoading(true);

    try {
      addNotification("BUSCANDO LIÇÕES...", "info");
      addNotification("SE VOCÊ PAGOU POR ISSO VC FOI SCAMMADO", "info");
      addNotification("FAÇA SUAS LIÇÕES EM MINUTOS", "info");
      addNotification("AMO NUGGET", "info");

      const fetchedTasks = await fetchUserTasks(authToken, userName, filter);

      if (fetchedTasks.length > 0) {
        setTasks(fetchedTasks);
        setIsModalOpen(true);
        addNotification(`${fetchedTasks.length} LIÇÕES ENCONTRADAS`, "success");
      } else {
        addNotification("NENHUMA ATIVIDADE ENCONTRADA", "info");
      }
    } catch (error) {
      console.error(error);
      addNotification("ERRO AO BUSCAR ATIVIDADES", "error");
      await logger.logError(currentRa, userName || undefined, "Erro ao buscar atividades");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTasks = async (selectedTasks: Task[], isDraft: boolean, minTime: number, maxTime: number) => {
    setIsModalOpen(false);

    if (selectedTasks.length === 0) {
      addNotification("NENHUMA ATIVIDADE SELECIONADA", "info");
      return;
    }

    addNotification(`${selectedTasks.length} ATIVIDADES ENVIADAS PARA PROCESSAMENTO`, "info");

    const result = await processTasks(
      selectedTasks,
      isDraft,
      minTime,
      maxTime,
      async (message, type) => {
        addNotification(message, type);
        
        // Log task results
        const taskTitle = message.includes("'") ? message.split("'")[1] : "";
        if (type === "success" && currentRa && userName) {
          await logger.logTaskCompleted(currentRa, userName, "", taskTitle);
        } else if (type === "error" && currentRa && userName) {
          await logger.logTaskFailed(currentRa, userName, "", taskTitle, message);
        }
      }
    );

    if (result.success > 0) {
      addNotification(`${result.success} DE ${selectedTasks.length} ATIVIDADES PROCESSADAS COM SUCESSO`, "success");
    }

    if (result.error > 0) {
      addNotification(`${result.error} ATIVIDADES FALHARAM`, "error");
    }
  };

  // Show banned screen if user is banned
  if (banInfo?.isBanned) {
    return (
      <BannedScreen
        reason={banInfo.reason || "Violação das regras de uso"}
        bannedAt={banInfo.bannedAt}
        onBack={() => {
          clearBanInfo();
          setCurrentRa("");
        }}
      />
    );
  }

  // Show warning screen if user has unacknowledged warning
  if (warningInfo?.hasWarning && !warningInfo.acknowledged) {
    return (
      <WarningScreen
        reason={warningInfo.reason || "Comportamento inadequado"}
        warnedAt={warningInfo.warnedAt}
        onAcknowledge={async () => {
          const success = await acknowledgeWarning(warningInfo.id, currentRa);
          return success;
        }}
        onBack={() => {
          clearWarningInfo();
          setCurrentRa("");
          setUserName(null);
          setAuthToken(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <DonationModal />
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tasks={tasks}
        onStartTasks={handleStartTasks}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm flex flex-col items-center"
      >
        <motion.div
          className="flex items-center gap-3 mb-2"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h1 className="text-5xl font-semibold text-gradient">FUKITOS</h1>
          <motion.img
            src={logo}
            alt="Logo FUKITOS"
            className="w-14 h-auto"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        <p className="text-foreground text-center mb-6">
          Sala do futuro-CMSP WEB/Tarefas Sp.
        </p>

        <SavedAccounts onSelectAccount={handleSelectAccount} currentRa={currentRa} />

        {userName && (
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2 bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 rounded-lg text-destructive text-sm font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair da conta ({userName})
          </motion.button>
        )}

        <LoginForm 
          onSearchTasks={handleSearchTasks} 
          onVerify={handleVerify}
          isLoading={isLoading} 
          userName={userName}
          initialRa={currentRa}
        />

        <div className="mt-6 flex flex-col items-center text-center">
          <span className="text-foreground text-sm mb-2">Entre no nosso servidor do Discord</span>
          <motion.a
            href="https://discord.gg/yNYSzNTz"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 text-gradient font-semibold"
          >
            <svg width="20" height="16" viewBox="0 0 30 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M25.3921 1.94129C23.4508 1.04167 21.3832 0.378789 19.2052 0C18.9369 0.473487 18.6212 1.12058 18.416 1.64142C16.1117 1.2942 13.8232 1.2942 11.5663 1.64142C11.3453 1.12058 11.0296 0.473487 10.7613 0C8.5833 0.378789 6.51574 1.04167 4.57445 1.94129L0.660291 7.84409C-0.397162 13.6048 0.123673 19.2709 2.72785 21.2122C5.23733 22.3801 7.71524 23.1535 10 23.1535C10.6158 22.317 11.1524 21.4174 11.6259 20.4862C10.7263 20.1547 9.87398 19.7286 9.06905 19.2393C9.29001 19.0815 9.49519 18.9079 9.70037 18.7501L14.6404 21.0544L20.0008 21.0544L24.8777 18.7501C25.0829 18.9237 25.2881 19.0815 25.509 19.2393C24.7041 19.7286 23.8361 20.139 22.9522 20.4862C23.4257 21.4174 23.9623 22.317 24.5778 23.1535C26.8608 22.3801 29.386 21.2122 31.8744 19.2709C32.4899 12.6894 30.817 6.99182 27.4236 1.94129H25.3921ZM10.0038 15.7987C8.52017 15.7987 7.30489 14.4256 7.30489 12.7368C7.30489 11.048 8.4886 9.67491 10.0038 9.67491C11.5189 9.67491 12.7184 11.048 12.7026 12.7368C12.7026 14.4098 11.5189 15.7987 10.0038 15.7987ZM19.9628 15.7987C18.4792 15.7987 17.2639 14.4256 17.2639 12.7368C17.2639 11.048 18.4476 9.67491 19.9628 9.67491C21.4779 9.67491 22.6774 11.048 22.6616 12.7368C22.6616 14.4098 21.4779 15.7987 19.9628 15.7987Z" fill="currentColor"/>
            </svg>
            <span>DISCORD BETA</span>
          </motion.a>
        </div>

        {/* Admin button - fixed bottom right, nearly invisible, requires 3 clicks */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            const newCount = adminClickCount + 1;
            setAdminClickCount(newCount);
            if (newCount >= 3) {
              setAdminClickCount(0);
              navigate("/admin-login");
            }
          }}
          className="fixed bottom-2 right-2 p-2 text-muted-foreground/5 hover:text-muted-foreground/15 transition-colors z-50 select-none"
        >
          <Shield className="w-3 h-3" />
        </motion.button>

        {/* Botão de sair do admin - só aparece durante manutenção */}
        {MAINTENANCE_CONFIG.MAINTENANCE_MODE && (
          <button
            onClick={handleLogoutAdmin}
            className="mt-4 text-xs text-muted-foreground/50 hover:text-destructive transition-colors"
          >
            Sair do modo admin
          </button>
        )}
      </motion.div>
    </div>
  );
};

export default Index;
