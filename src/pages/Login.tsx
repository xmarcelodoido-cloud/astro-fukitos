import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sparkles, Eye, EyeOff, ShieldCheck, LogIn, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SavedAccounts, saveAccount } from "@/components/SavedAccounts";
import { login } from "@/lib/api";
import { ofLogin } from "@/lib/openfuture";
import { useSession } from "@/contexts/SessionContext";
import { useBanCheck } from "@/hooks/useBanCheck";
import { useAntiInspect } from "@/hooks/useAntiInspect";
import { logger } from "@/lib/logger";
import { toast } from "sonner";

const UFS = [
  "SP", "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG",
  "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS",
  "SC", "SE", "TO",
];

const Login = () => {
  useAntiInspect();
  const navigate = useNavigate();
  const { setSession } = useSession();
  const { checkBan } = useBanCheck();

  const [ra, setRa] = useState("");
  const [digito, setDigito] = useState("");
  const [uf, setUf] = useState("SP");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const digitoRef = useRef<HTMLInputElement>(null);

  const handleRaChange = (v: string) => {
    const clean = v.replace(/\D/g, "").slice(0, 12);
    setRa(clean);
    if (clean.length >= 10 && !digito) digitoRef.current?.focus();
  };

  const handleSavedAccount = (full: string) => {
    // Formato salvo: RA + dígito + UF (ex: 0001234567890SP)
    const m = full.match(/^(\d+?)(\d)([A-Za-z]{2})$/);
    if (m) {
      setRa(m[1]);
      setDigito(m[2]);
      setUf(m[3].toUpperCase());
    } else {
      setRa(full.replace(/\D/g, ""));
    }
  };

  const handleLogin = async () => {
    if (!ra.trim() || !digito.trim() || !uf || !password.trim()) {
      toast.error("Preencha RA, dígito, UF e senha");
      return;
    }
    const fullRa = `${ra.trim()}${digito.trim()}${uf.toUpperCase()}`;
    setLoading(true);
    try {
      const banStatus = await checkBan(ra.trim());
      if (banStatus.isBanned) {
        toast.error("Este RA está banido");
        setLoading(false);
        return;
      }

      const data = await login(fullRa, password);

      // Conecta também ao backend das demais plataformas (melhor esforço)
      let ofConnected = false;
      try {
        await ofLogin(ra.trim(), digito.trim(), uf, password);
        ofConnected = true;
      } catch (e) {
        console.warn("Plataformas extras indisponíveis", e);
      }

      const sess = {
        ra: fullRa,
        nick: data.nick,
        auth_token: data.auth_token,
        roomCode: data.roomCode || "",
        targets: [] as string[],
        raDigits: ra.trim(),
        digito: digito.trim(),
        uf: uf.toUpperCase(),
        ofConnected,
      };
      const { getSessionData } = await import("@/lib/api");
      const sd = getSessionData();
      if (sd) sess.targets = sd.targets;

      setSession(sess);
      saveAccount(fullRa, data.nick);
      await logger.logLogin(fullRa, data.nick);
      toast.success(`Bem-vindo, ${data.nick}!`);
      navigate("/", { replace: true });
    } catch (e: any) {
      console.error(e);
      toast.error("RA ou senha inválidos");
    } finally {
      setLoading(false);
    }
  };

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
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
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-3xl font-bold font-bricolage text-gradient">Astrokitos</span>
          </div>
          <p className="text-muted-foreground text-sm">Entre com sua conta da Sala do Futuro</p>
        </div>

        <div className="relative rounded-3xl border border-border bg-card p-6 md:p-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-semibold mb-5">
            <ShieldCheck className="w-3.5 h-3.5" /> Login seguro
          </div>

          <SavedAccounts onSelectAccount={handleSavedAccount} currentRa={`${ra}${digito}${uf}`} />

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
              <div className="flex flex-col gap-1.5 min-w-0">
                <Label htmlFor="ra">RA</Label>
                <Input
                  id="ra"
                  inputMode="numeric"
                  value={ra}
                  onChange={(e) => handleRaChange(e.target.value)}
                  placeholder="000123456789"
                  onKeyDown={onEnter}
                />
              </div>

              <div className="flex flex-col gap-1.5 w-16">
                <Label htmlFor="digito">Dígito</Label>
                <Input
                  id="digito"
                  ref={digitoRef}
                  inputMode="numeric"
                  maxLength={1}
                  value={digito}
                  onChange={(e) => setDigito(e.target.value.replace(/\D/g, "").slice(0, 1))}
                  placeholder="0"
                  className="text-center"
                  onKeyDown={onEnter}
                />
              </div>

              <div className="flex flex-col gap-1.5 w-20">
                <Label htmlFor="uf">UF</Label>
                <Select value={uf} onValueChange={setUf}>
                  <SelectTrigger id="uf">
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {UFS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                  onKeyDown={onEnter}
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
              className="w-full bg-gradient-brand hover:opacity-90 text-primary-foreground font-semibold py-6 glow-primary"
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
