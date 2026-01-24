import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { MaintenanceMode } from "@/components/MaintenanceMode";
import { MAINTENANCE_CONFIG } from "@/config/maintenance";

const queryClient = new QueryClient();

const App = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    // Verificar se o admin já desbloqueou
    const unlocked = localStorage.getItem("fukitos_admin_unlocked");
    if (unlocked === "true") {
      setIsUnlocked(true);
    }
  }, []);

  // Se modo de manutenção está ativo e usuário não é admin
  if (MAINTENANCE_CONFIG.MAINTENANCE_MODE && !isUnlocked) {
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
          <Routes>
            <Route path="/" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
