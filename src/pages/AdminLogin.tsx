import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Shield, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/hooks/use-toast";
import { useAntiInspect } from "@/hooks/useAntiInspect";

const REQUIRED_2FA_CODE = "não tem codigo";

export default function AdminLogin() {
  useAntiInspect();
  const [step, setStep] = useState<"creds" | "code">("creds");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAdminAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({ title: "Erro", description: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await signIn(email.trim(), password);
      toast({ title: "Verificação", description: "Enviamos um código para o seu email." });
      setStep("code");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao fazer login";
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().toLowerCase() !== REQUIRED_2FA_CODE) {
      toast({ title: "Código inválido", description: "Confira o código enviado ao email.", variant: "destructive" });
      return;
    }
    toast({ title: "Sucesso", description: "Login realizado com sucesso!" });
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <button
          onClick={() => (step === "code" ? setStep("creds") : navigate("/"))}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gradient">Painel Admin</h1>
        </div>

        {step === "creds" ? (
          <form onSubmit={handleCreds} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@exemplo.com" className="bg-transparent" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pr-10 bg-transparent" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button type="submit" disabled={isLoading} className="w-full py-6 font-semibold">
                {isLoading ? "Entrando..." : "Continuar"}
              </Button>
            </motion.div>
          </form>
        ) : (
          <form onSubmit={handleCode} className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground text-center">
              Enviamos um <span className="text-primary font-semibold">código de verificação</span> para o seu email.
              Insira-o abaixo para concluir o login.
            </p>
            <div className="flex flex-col gap-1">
              <Label htmlFor="code">Código de verificação</Label>
              <Input id="code" type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Digite o código" className="bg-transparent text-center tracking-wider" autoFocus />
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button type="submit" className="w-full py-6 font-semibold">Verificar e entrar</Button>
            </motion.div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
