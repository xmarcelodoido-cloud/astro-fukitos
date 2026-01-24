import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { VerifyButton } from "./VerifyButton";

interface LoginFormProps {
  onSearchTasks: (filter: 'pending' | 'expired', ra: string, password: string) => void;
  isLoading: boolean;
}

export function LoginForm({ onSearchTasks, isLoading }: LoginFormProps) {
  const [ra, setRa] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const handleSearch = (filter: 'pending' | 'expired') => {
    if (!ra.trim()) return;
    if (!password.trim()) return;
    if (!isVerified) return;
    onSearchTasks(filter, ra.trim(), password);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col gap-1">
        <Label htmlFor="ra" className="text-foreground">RA</Label>
        <div className="relative">
          <Input
            id="ra"
            type="text"
            value={ra}
            onChange={(e) => setRa(e.target.value)}
            placeholder="RA + Dígito + UF"
            className="pr-10 bg-transparent border-border text-foreground placeholder:text-muted-foreground"
          />
          {ra && (
            <button
              type="button"
              onClick={() => setRa("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-primary-foreground rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="w-3 h-3 text-background" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="password" className="text-foreground">Senha</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Digite sua senha"
            className="pr-10 bg-transparent border-border text-foreground placeholder:text-muted-foreground"
          />
          {password && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-primary-foreground rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-3 h-3 text-background" />
              ) : (
                <Eye className="w-3 h-3 text-background" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-2">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={() => handleSearch('pending')}
            disabled={isLoading || !isVerified}
            className="w-full bg-secondary hover:bg-muted text-secondary-foreground font-semibold py-6"
          >
            Atividades Pendentes
          </Button>
        </motion.div>

        <VerifyButton onVerified={() => setIsVerified(true)} isVerified={isVerified} />

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={() => handleSearch('expired')}
            disabled={isLoading || !isVerified}
            className="w-full bg-secondary hover:bg-muted text-secondary-foreground font-semibold py-6"
          >
            Atividades Expiradas
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
