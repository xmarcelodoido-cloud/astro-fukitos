import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Brain, BookOpen, Loader2, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { login, fetchUserTasks, Task } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { IntroFlow } from "@/components/IntroFlow";
import { useAntiInspect } from "@/hooks/useAntiInspect";

const ModoIA = () => {
  const navigate = useNavigate();
  const [introDone, setIntroDone] = useState(false);
  useAntiInspect();
  const [ra, setRa] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [userNick, setUserNick] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState<number | null>(null);

  const handleLogin = async () => {
    if (!ra || !password) {
      toast.error("Preencha RA e senha");
      return;
    }
    setLoading(true);
    try {
      const data = await login(ra, password);
      setUserNick(data.nick || "Aluno");
      setIsLogged(true);
      toast.success(`Bem-vindo, ${data.nick}!`);
      // Fetch pending tasks
      const pending = await fetchUserTasks(data.auth_token, data.nick, "pending");
      setTasks(pending);
      if (pending.length === 0) {
        toast.info("Nenhuma atividade pendente encontrada");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (task: Task) => {
    setStarting(task.id);
    try {
      const taskContent = JSON.stringify(task._rawData?.questions || task._rawData || {}, null, 2).slice(0, 4000);
      // Tempo mínimo aleatório entre 5 e 9 minutos
      const requiredMinutes = 5 + Math.floor(Math.random() * 5);
      const { data, error } = await supabase
        .from("ai_sessions")
        .insert({
          ra,
          student_name: userNick,
          task_id: String(task.id),
          task_title: task.title,
          task_content: taskContent,
          required_minutes: requiredMinutes,
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) throw error;
      navigate(`/ia/sessao/${data.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao iniciar sessão: " + err.message);
    } finally {
      setStarting(null);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {!introDone && (
        <IntroFlow storageKey="astrokitos_intro_ia" onDone={() => setIntroDone(true)} />
      )}
      <div className="absolute top-0 left-1/3 w-96 h-96 rounded-full bg-primary/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/3 w-96 h-96 rounded-full bg-accent/15 blur-[120px] pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 pt-4 max-w-4xl">
        <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-xs md:text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            <span className="font-semibold">Aviso:</span> IAs podem falhar. Sempre revise as respostas antes de terminar o estudo.
          </span>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-bold font-bricolage text-gradient">
              Modo IA Educativo
            </h1>
          </div>
          <div className="w-16" />
        </div>

        {!isLogged ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl p-6 md:p-8 max-w-md mx-auto card-shadow"
          >
            <h2 className="text-2xl font-bold mb-2 font-bricolage">Entrar</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Use seu RA da Sala do Futuro para buscar suas atividades.
            </p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="ra">RA</Label>
                <Input
                  id="ra"
                  placeholder="Digite seu RA"
                  value={ra}
                  onChange={(e) => setRa(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <Button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-gradient-brand text-white font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Buscando atividades...
                  </>
                ) : (
                  "Entrar e buscar atividades"
                )}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold font-bricolage">
                Olá, {userNick}!
              </h2>
              <p className="text-sm text-muted-foreground">
                Escolha uma atividade para estudar com a IA tutora.
              </p>
            </div>

            {tasks.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-8 text-center card-shadow">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Nenhuma atividade pendente encontrada.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {tasks.map((task) => (
                  <motion.div
                    key={task.id}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="bg-card border border-border rounded-xl p-5 card-shadow hover:border-primary/60 transition-all"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-brand flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm md:text-base line-clamp-2 mb-1">
                          {task.title}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {task.room || "Sala"}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleStart(task)}
                      disabled={starting === task.id}
                      size="sm"
                      className="w-full bg-gradient-brand text-white"
                    >
                      {starting === task.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Iniciando...
                        </>
                      ) : (
                        <>
                          <Brain className="w-4 h-4 mr-2" />
                          Estudar com IA
                        </>
                      )}
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ModoIA;
