import { useState } from "react";
import { motion } from "framer-motion";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MAINTENANCE_CONFIG } from "@/config/maintenance";
import { useAntiInspect } from "@/hooks/useAntiInspect";

interface MaintenanceModeProps {
  onUnlock: () => void;
  expectedReturn: string;
}

export const MaintenanceMode = ({ onUnlock, expectedReturn }: MaintenanceModeProps) => {
  useAntiInspect();
  const [password, setPassword] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [error, setError] = useState("");

  const handleUnlock = () => {
    if (password === MAINTENANCE_CONFIG.ADMIN_PASSWORD) {
      localStorage.setItem("fukitos_admin_unlocked", "true");
      onUnlock();
    } else {
      setError("Senha incorreta");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleUnlock();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md flex flex-col items-center text-center"
      >

        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h1 className="text-4xl font-bold text-gradient mb-4">EM MANUTENÇÃO</h1>
        </motion.div>

        <div className="glass-effect rounded-2xl p-6 w-full">
          <div className="flex items-center justify-center gap-2 mb-4">
            <svg
              className="w-6 h-6 text-primary animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-foreground font-medium">Estamos trabalhando em melhorias</span>
          </div>

          <p className="text-muted-foreground mb-4">
            O FUKITOS está temporariamente indisponível para manutenção.
          </p>

          <div className="bg-primary/10 rounded-lg p-4 mb-4">
            <p className="text-sm text-muted-foreground mb-1">Previsão de retorno:</p>
            <p className="text-lg font-semibold text-primary">{expectedReturn}</p>
          </div>

          <div className="flex flex-col items-center gap-2">
            <a
              href="https://discord.gg/yNYSzNTz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-2"
            >
              <svg width="16" height="12" viewBox="0 0 30 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M25.3921 1.94129C23.4508 1.04167 21.3832 0.378789 19.2052 0C18.9369 0.473487 18.6212 1.12058 18.416 1.64142C16.1117 1.2942 13.8232 1.2942 11.5663 1.64142C11.3453 1.12058 11.0296 0.473487 10.7613 0C8.5833 0.378789 6.51574 1.04167 4.57445 1.94129L0.660291 7.84409C-0.397162 13.6048 0.123673 19.2709 2.72785 21.2122C5.23733 22.3801 7.71524 23.1535 10 23.1535C10.6158 22.317 11.1524 21.4174 11.6259 20.4862C10.7263 20.1547 9.87398 19.7286 9.06905 19.2393C9.29001 19.0815 9.49519 18.9079 9.70037 18.7501L14.6404 21.0544L20.0008 21.0544L24.8777 18.7501C25.0829 18.9237 25.2881 19.0815 25.509 19.2393C24.7041 19.7286 23.8361 20.139 22.9522 20.4862C23.4257 21.4174 23.9623 22.317 24.5778 23.1535C26.8608 22.3801 29.386 21.2122 31.8744 19.2709C32.4899 12.6894 30.817 6.99182 27.4236 1.94129H25.3921ZM10.0038 15.7987C8.52017 15.7987 7.30489 14.4256 7.30489 12.7368C7.30489 11.048 8.4886 9.67491 10.0038 9.67491C11.5189 9.67491 12.7184 11.048 12.7026 12.7368C12.7026 14.4098 11.5189 15.7987 10.0038 15.7987ZM19.9628 15.7987C18.4792 15.7987 17.2639 14.4256 17.2639 12.7368C17.2639 11.048 18.4476 9.67491 19.9628 9.67491C21.4779 9.67491 22.6774 11.048 22.6616 12.7368C22.6616 14.4098 21.4779 15.7987 19.9628 15.7987Z" fill="currentColor"/>
              </svg>
              Acompanhe no Discord
            </a>
          </div>
        </div>

        {/* Admin unlock */}
        <div className="mt-8">
          {!showPasswordInput ? (
            <button
              onClick={() => setShowPasswordInput(true)}
              className="w-8 h-8 text-muted-foreground/10 hover:text-muted-foreground/30 transition-colors select-none flex items-center justify-center text-lg"
            >
              •
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-2"
            >
              <Input
                type="password"
                placeholder="Senha de admin"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-48 text-center text-sm"
              />
              <Button
                onClick={handleUnlock}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                Desbloquear
              </Button>
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
