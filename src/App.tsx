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

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const ModeSelect = lazy(() => import("./pages/ModeSelect"));
const ModoIA = lazy(() => import("./pages/ModoIA"));
const SessaoIA = lazy(() => import("./pages/SessaoIA"));

const queryClient = new QueryClient();

const AppShell = () => {
  const location = useLocation();
  const { state: maintenance, loading } = useMaintenanceSetting();

  const [isUnlocked, setIsUnlocked] = useState(() => {
    try {
      return localStorage.getItem("fukitos_admin_unlocked") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      const unlocked = localStorage.getItem("fukitos_admin_unlocked");
      setIsUnlocked(unlocked === "true");
    } catch { /* ignore */ }
  }, []);

  // Permite acesso ao admin mesmo em manutenção
  const isAdminRoute =
    location.pathname.startsWith("/admin");

  if (loading) return null;

  if (maintenance?.active && !isUnlocked && !isAdminRoute) {
    return (
      <MaintenanceMode
        onUnlock={() => setIsUnlocked(true)}
        expectedReturn={maintenance.expected_return}
      />
    );
  }

  return (
    <Suspense fallback={null}>
      <EntryDonationModal />
      <Routes>
        <Route path="/" element={<ModeSelect />} />
        <Route path="/automatico" element={<Index />} />
        <Route path="/ia" element={<ModoIA />} />
        <Route path="/ia/sessao/:sessionId" element={<SessaoIA />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin-login" element={<AdminLogin />} />
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
          <AppShell />
        </BrowserRouter>
      </SecurityShield>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
