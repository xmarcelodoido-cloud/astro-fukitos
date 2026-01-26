import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  Users,
  Activity,
  Ban,
  LogOut,
  Search,
  Trash2,
  Eye,
  AlertTriangle,
  Bell,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ActivityLog {
  id: string;
  ra: string | null;
  student_name: string | null;
  log_type: string;
  details: unknown;
  user_agent: string | null;
  created_at: string;
}

interface BannedStudent {
  id: string;
  ra: string;
  student_name: string | null;
  reason: string;
  banned_at: string;
}

interface StudentWarning {
  id: string;
  ra: string;
  student_name: string | null;
  reason: string;
  warned_at: string;
  acknowledged: boolean;
}

export default function Admin() {
  const { user, isAdmin, isLoading, signOut } = useAdminAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [bannedStudents, setBannedStudents] = useState<BannedStudent[]>([]);
  const [warnings, setWarnings] = useState<StudentWarning[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // Ban modal state
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banRa, setBanRa] = useState("");
  const [banName, setBanName] = useState("");
  const [banReason, setBanReason] = useState("");
  
  // Warning modal state
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [warningRa, setWarningRa] = useState("");
  const [warningName, setWarningName] = useState("");
  const [warningReason, setWarningReason] = useState("");
  
  // Unban modal state
  const [unbanModalOpen, setUnbanModalOpen] = useState(false);
  const [selectedBan, setSelectedBan] = useState<BannedStudent | null>(null);

  // Remove warning modal state
  const [removeWarningModalOpen, setRemoveWarningModalOpen] = useState(false);
  const [selectedWarning, setSelectedWarning] = useState<StudentWarning | null>(null);

  // Details modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate("/admin-login");
    }
  }, [user, isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setIsLoadingData(true);
    await Promise.all([fetchLogs(), fetchBannedStudents(), fetchWarnings()]);
    setIsLoadingData(false);
  };

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("Error fetching logs:", error);
      return;
    }

    setLogs(data || []);
  };

  const fetchBannedStudents = async () => {
    const { data, error } = await supabase
      .from("banned_students")
      .select("*")
      .order("banned_at", { ascending: false });

    if (error) {
      console.error("Error fetching banned students:", error);
      return;
    }

    setBannedStudents(data || []);
  };

  const fetchWarnings = async () => {
    const { data, error } = await supabase
      .from("student_warnings")
      .select("*")
      .order("warned_at", { ascending: false });

    if (error) {
      console.error("Error fetching warnings:", error);
      return;
    }

    setWarnings(data || []);
  };

  const handleBan = async () => {
    if (!banRa.trim() || !banReason.trim()) {
      toast({
        title: "Erro",
        description: "Preencha o RA e o motivo do banimento",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("banned_students").insert({
      ra: banRa.trim(),
      student_name: banName.trim() || null,
      reason: banReason.trim(),
    });

    if (error) {
      if (error.code === "23505") {
        toast({
          title: "Erro",
          description: "Este RA já está banido",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao banir estudante",
          variant: "destructive",
        });
      }
      return;
    }

    toast({
      title: "Sucesso",
      description: `RA ${banRa} foi banido com sucesso`,
    });

    setBanModalOpen(false);
    setBanRa("");
    setBanName("");
    setBanReason("");
    fetchBannedStudents();
  };

  const handleWarning = async () => {
    if (!warningRa.trim() || !warningReason.trim()) {
      toast({
        title: "Erro",
        description: "Preencha o RA e o motivo do aviso",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("student_warnings").insert({
      ra: warningRa.trim(),
      student_name: warningName.trim() || null,
      reason: warningReason.trim(),
    });

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao enviar aviso",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: `Aviso enviado para RA ${warningRa}`,
    });

    setWarningModalOpen(false);
    setWarningRa("");
    setWarningName("");
    setWarningReason("");
    fetchWarnings();
  };

  const handleUnban = async () => {
    if (!selectedBan) return;

    const { error } = await supabase
      .from("banned_students")
      .delete()
      .eq("id", selectedBan.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao remover banimento",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: `Banimento de ${selectedBan.ra} foi removido`,
    });

    setUnbanModalOpen(false);
    setSelectedBan(null);
    fetchBannedStudents();
  };

  const handleRemoveWarning = async () => {
    if (!selectedWarning) return;

    const { error } = await supabase
      .from("student_warnings")
      .delete()
      .eq("id", selectedWarning.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao remover aviso",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: `Aviso de ${selectedWarning.ra} foi removido`,
    });

    setRemoveWarningModalOpen(false);
    setSelectedWarning(null);
    fetchWarnings();
  };

  const handleLogout = async () => {
    try {
      await signOut();
      // Limpar qualquer estado de admin do localStorage
      localStorage.removeItem("fukitos_admin_unlocked");
      navigate("/admin-login");
    } catch (error) {
      console.error("Error during logout:", error);
      navigate("/admin-login");
    }
  };

  const filteredLogs = logs.filter(
    (log) =>
      log.ra?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.log_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case "login":
        return "text-blue-500";
      case "task_completed":
        return "text-green-500";
      case "task_failed":
        return "text-red-500";
      case "inspect_attempt":
        return "text-yellow-500";
      case "error":
        return "text-orange-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getLogTypeLabel = (type: string) => {
    switch (type) {
      case "login":
        return "Login";
      case "task_completed":
        return "Atividade OK";
      case "task_failed":
        return "Atividade Falhou";
      case "inspect_attempt":
        return "Tentou Inspecionar";
      case "error":
        return "Erro";
      default:
        return type;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading || isLoadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gradient">Painel Admin</h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-secondary/30 rounded-xl p-4">
            <Activity className="w-5 h-5 text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{logs.length}</p>
            <p className="text-sm text-muted-foreground">Total de Logs</p>
          </div>
          <div className="bg-secondary/30 rounded-xl p-4">
            <Users className="w-5 h-5 text-green-500 mb-2" />
            <p className="text-2xl font-bold">
              {new Set(logs.filter((l) => l.ra).map((l) => l.ra)).size}
            </p>
            <p className="text-sm text-muted-foreground">RAs Únicos</p>
          </div>
          <div className="bg-secondary/30 rounded-xl p-4">
            <Ban className="w-5 h-5 text-red-500 mb-2" />
            <p className="text-2xl font-bold">{bannedStudents.length}</p>
            <p className="text-sm text-muted-foreground">Banidos</p>
          </div>
          <div className="bg-secondary/30 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mb-2" />
            <p className="text-2xl font-bold">
              {logs.filter((l) => l.log_type === "inspect_attempt").length}
            </p>
            <p className="text-sm text-muted-foreground">Inspeções</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="logs" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="logs">
              <Activity className="w-4 h-4 mr-2" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="warnings">
              <Bell className="w-4 h-4 mr-2" />
              Avisos
            </TabsTrigger>
            <TabsTrigger value="banned">
              <Ban className="w-4 h-4 mr-2" />
              Banidos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="logs">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por RA, nome ou tipo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={fetchLogs} variant="outline">
                Atualizar
              </Button>
            </div>

            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>RA</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.slice(0, 100).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.ra || "-"}
                      </TableCell>
                      <TableCell>{log.student_name || "-"}</TableCell>
                      <TableCell>
                        <span className={getLogTypeColor(log.log_type)}>
                          {getLogTypeLabel(log.log_type)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedLog(log);
                              setDetailsModalOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {log.ra && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Enviar aviso"
                                onClick={() => {
                                  setWarningRa(log.ra || "");
                                  setWarningName(log.student_name || "");
                                  setWarningModalOpen(true);
                                }}
                              >
                                <Bell className="w-4 h-4 text-yellow-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Banir"
                                onClick={() => {
                                  setBanRa(log.ra || "");
                                  setBanName(log.student_name || "");
                                  setBanModalOpen(true);
                                }}
                              >
                                <Ban className="w-4 h-4 text-red-500" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="warnings">
            <div className="flex items-center justify-between mb-4">
              <p className="text-muted-foreground">
                {warnings.length} avisos enviados ({warnings.filter(w => !w.acknowledged).length} pendentes)
              </p>
              <Button onClick={() => setWarningModalOpen(true)} variant="outline" className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10">
                <Bell className="w-4 h-4 mr-2" />
                Enviar Aviso
              </Button>
            </div>

            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RA</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warnings.map((warning) => (
                    <TableRow key={warning.id}>
                      <TableCell className="font-mono">{warning.ra}</TableCell>
                      <TableCell>{warning.student_name || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {warning.reason}
                      </TableCell>
                      <TableCell>{formatDate(warning.warned_at)}</TableCell>
                      <TableCell>
                        <span className={warning.acknowledged ? "text-green-500" : "text-yellow-500"}>
                          {warning.acknowledged ? "Lido" : "Pendente"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedWarning(warning);
                            setRemoveWarningModalOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="banned">
            <div className="flex items-center justify-between mb-4">
              <p className="text-muted-foreground">
                {bannedStudents.length} estudantes banidos
              </p>
              <Button onClick={() => setBanModalOpen(true)}>
                <Ban className="w-4 h-4 mr-2" />
                Banir RA
              </Button>
            </div>

            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RA</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bannedStudents.map((ban) => (
                    <TableRow key={ban.id}>
                      <TableCell className="font-mono">{ban.ra}</TableCell>
                      <TableCell>{ban.student_name || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {ban.reason}
                      </TableCell>
                      <TableCell>{formatDate(ban.banned_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedBan(ban);
                            setUnbanModalOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Ban Modal */}
      <Dialog open={banModalOpen} onOpenChange={setBanModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Banir Estudante</DialogTitle>
            <DialogDescription>
              O estudante não poderá usar o sistema até ser desbanido.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">RA</label>
              <Input
                value={banRa}
                onChange={(e) => setBanRa(e.target.value)}
                placeholder="Digite o RA"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nome (opcional)</label>
              <Input
                value={banName}
                onChange={(e) => setBanName(e.target.value)}
                placeholder="Nome do estudante"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Motivo</label>
              <Textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Explique o motivo do banimento"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleBan}>
              Banir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unban Modal */}
      <Dialog open={unbanModalOpen} onOpenChange={setUnbanModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Banimento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o banimento de {selectedBan?.ra}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnbanModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUnban}>Desbanir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Log</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground">Data:</p>
                <p>{formatDate(selectedLog.created_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">RA:</p>
                <p className="font-mono">{selectedLog.ra || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Nome:</p>
                <p>{selectedLog.student_name || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tipo:</p>
                <p className={getLogTypeColor(selectedLog.log_type)}>
                  {getLogTypeLabel(selectedLog.log_type)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">User Agent:</p>
                <p className="text-xs break-all">
                  {selectedLog.user_agent || "-"}
                </p>
              </div>
              {selectedLog.details && typeof selectedLog.details === 'object' && (
                <div>
                  <p className="text-muted-foreground">Detalhes:</p>
                  <pre className="bg-secondary/50 p-2 rounded text-xs overflow-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Warning Modal */}
      <Dialog open={warningModalOpen} onOpenChange={setWarningModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Aviso</DialogTitle>
            <DialogDescription>
              O estudante receberá um aviso ao tentar usar o sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">RA</label>
              <Input
                value={warningRa}
                onChange={(e) => setWarningRa(e.target.value)}
                placeholder="Digite o RA"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nome (opcional)</label>
              <Input
                value={warningName}
                onChange={(e) => setWarningName(e.target.value)}
                placeholder="Nome do estudante"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Motivo do Aviso</label>
              <Textarea
                value={warningReason}
                onChange={(e) => setWarningReason(e.target.value)}
                placeholder="Explique o motivo do aviso"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWarningModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleWarning} className="bg-yellow-600 hover:bg-yellow-700">
              Enviar Aviso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Warning Modal */}
      <Dialog open={removeWarningModalOpen} onOpenChange={setRemoveWarningModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Aviso</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o aviso de {selectedWarning?.ra}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveWarningModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRemoveWarning}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
