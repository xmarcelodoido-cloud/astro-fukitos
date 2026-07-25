import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sparkles, Eye, EyeOff, ShieldCheck, LogIn, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SavedAccounts, saveAccount } from "@/components/SavedAccounts";
import { login } from "@/lib/api";
import { useSession } from "@/contexts/SessionContext";
import { useBanCheck } from "@/hooks/useBanCheck";
import { useAntiInspect } from "@/hooks/useAntiInspect";
import { logger } from "@/lib/logger";
import { toast } from "sonner";

const Login = () => {
  useAntiInspect();
  const navigate = useNavigate();
  const { setSession } = useSession();
  const { checkBan } = useBanCheck();
  const [ra, setRa] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!ra.trim() || !password.trim()) {
      toast.error("Preencha RA e senha");
      return;
    }
    setLoading(true);
    try {
      const banStatus = await checkBan(ra.trim());
      if (banStatus.isBanned) {
        toast.error("Este RA está banido");
        setLoading(false);
        return;
      }
      const data = await login(ra.trim(), password);
      const sess = {
        ra: ra.trim(),
        nick: data.nick,
        auth_token: data.auth_token,
        roomCode: data.roomCode || "",
        targets: [] as string[],
      };
      // pull targets from api.ts memory
      const { getSessionData } = await import("@/lib/api");
      const sd = getSessionData();
      if (sd) sess.targets = sd.targets;
      setSession(sess);
      saveAccount(ra.trim(), data.nick);
      await logger.logLogin(ra.trim(), data.nick);
      toast.success(`Bem-vindo, ${data.nick}!`);
      navigate("/", { replace: true });
    } catch (e: any) {
      console.error(e);
      toast.error("RA ou senha inválidos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute top-0 left-1/4 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-brand flex items-center justify-center glow-primary">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-bold font-bricolage text-gradient">Astrokitos</span>
          </div>
          <p className="text-muted-foreground text-sm">Entre com sua conta da Sala do Futuro</p>
        </div>

        <div className="relative rounded-3xl border border-border bg-card p-6 md:p-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-semibold mb-5">
            <ShieldCheck className="w-3.5 h-3.5" /> Login seguro
          </div>

          <SavedAccounts onSelectAccount={(r) => setRa(r)} currentRa={ra} />

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ra">RA</Label>
              <Input
                id="ra"
                value={ra}
                onChange={(e) => setRa(e.target.value)}
                placeholder="RA + Dígito + UF"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pw">Senha</Label>
              <div className="relative">
                <Input
                  id="pw"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  className="pr-10"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-gradient-brand hover:opacity-90 text-white font-semibold py-6 glow-primary"
            >
              <LogIn className="w-4 h-4 mr-2" />
              {loading ? "Entrando..." : "Entrar no Astrokitos"}
            </Button>
          </div>

          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
            <a
              href="https://discord.gg/wc4TUHG7"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition"
            >
              Discord
            </a>
            <a
              href="https://pixgg.com/zenin"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-primary transition"
            >
              <Heart className="w-3 h-3" /> Apoiar o projeto
            </a>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/60 mt-6">
          Ao entrar, você concorda com o uso responsável da plataforma.
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
