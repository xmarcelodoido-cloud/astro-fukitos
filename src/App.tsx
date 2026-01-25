import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MaintenanceMode } from "@/components/MaintenanceMode";
import { MAINTENANCE_CONFIG } from "@/config/maintenance";

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => {
  // Importante: ler o localStorage de forma síncrona no primeiro render,
  // para evitar qualquer "flash" do app principal.
  const [isUnlocked, setIsUnlocked] = useState(() => {
    try {
      return localStorage.getItem("fukitos_admin_unlocked") === "true";
    } catch {
      return false;
    }
  });

  const isMaintenanceActive = useMemo(
    () => Boolean(MAINTENANCE_CONFIG.MAINTENANCE_MODE),
    []
  );

  useEffect(() => {
    // Verificar se o admin já desbloqueou
    try {
      const unlocked = localStorage.getItem("fukitos_admin_unlocked");
      setIsUnlocked(unlocked === "true");
    } catch {
      // ignore
    }
  }, []);

  // Se modo de manutenção está ativo e usuário não é admin
  if (isMaintenanceActive && !isUnlocked) {
    return (
      <MaintenanceMode
        onUnlock={() => setIsUnlocked(true)}
        expectedReturn={MAINTENANCE_CONFIG.EXPECTED_RETURN}
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Index />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
