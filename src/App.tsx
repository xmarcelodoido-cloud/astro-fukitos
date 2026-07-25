import { Suspense, lazy, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { MaintenanceMode } from "@/components/MaintenanceMode";
import { SecurityShield } from "@/components/SecurityShield";
import { EntryDonationModal } from "@/components/EntryDonationModal";
import { useMaintenanceSetting } from "@/hooks/useMaintenanceSetting";
import { SessionProvider } from "@/contexts/SessionContext";
import { RequireAuth } from "@/components/RequireAuth";

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const ModeSelect = lazy(() => import("./pages/ModeSelect"));
const ModoIA = lazy(() => import("./pages/ModoIA"));
const SessaoIA = lazy(() => import("./pages/SessaoIA"));
const LeiaSP = lazy(() => import("./pages/LeiaSP"));
const Redacao = lazy(() => import("./pages/Redacao"));
const Matific = lazy(() => import("./pages/Matific"));
const Khan = lazy(() => import("./pages/Khan"));
const Speak = lazy(() => import("./pages/Speak"));
const Perfil = lazy(() => import("./pages/Perfil"));
const Login = lazy(() => import("./pages/Login"));

const queryClient = new QueryClient();

const AppShell = () => {
  const location = useLocation();
  const { state: maintenance, loading } = useMaintenanceSetting();

  const [isUnlocked, setIsUnlocked] = useState(() => {
    try { return localStorage.getItem("fukitos_admin_unlocked") === "true"; } catch { return false; }
  });

  useEffect(() => {
    try {
      const unlocked = localStorage.getItem("fukitos_admin_unlocked");
      setIsUnlocked(unlocked === "true");
    } catch { /* ignore */ }
  }, []);

  const isAdminRoute = location.pathname.startsWith("/admin");

  if (loading) return null;

  if (maintenance?.active && !isUnlocked && !isAdminRoute) {
    return <MaintenanceMode onUnlock={() => setIsUnlocked(true)} expectedReturn={maintenance.expected_return} />;
  }

  return (
    <Suspense fallback={null}>
      <EntryDonationModal />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/" element={<RequireAuth><ModeSelect /></RequireAuth>} />
        <Route path="/automatico" element={<RequireAuth><Index /></RequireAuth>} />
        <Route path="/ia" element={<RequireAuth><ModoIA /></RequireAuth>} />
        <Route path="/ia/sessao/:sessionId" element={<RequireAuth><SessaoIA /></RequireAuth>} />
        <Route path="/leia" element={<RequireAuth><LeiaSP /></RequireAuth>} />
        <Route path="/redacao" element={<RequireAuth><Redacao /></RequireAuth>} />
        <Route path="/matific" element={<RequireAuth><Matific /></RequireAuth>} />
        <Route path="/khan" element={<RequireAuth><Khan /></RequireAuth>} />
        <Route path="/speak" element={<RequireAuth><Speak /></RequireAuth>} />
        <Route path="/perfil" element={<RequireAuth><Perfil /></RequireAuth>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SecurityShield>
        <BrowserRouter>
          <SessionProvider>
            <AppShell />
          </SessionProvider>
        </BrowserRouter>
      </SecurityShield>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
