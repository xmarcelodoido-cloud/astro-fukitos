import { BookOpen } from "lucide-react";
import { PlatformShell } from "@/components/PlatformShell";
import { useAntiInspect } from "@/hooks/useAntiInspect";

const LeiaSP = () => {
  useAntiInspect();
  return (
    <PlatformShell
      name="LeiaSP"
      tagline="Leituras e atividades da Sala do Futuro resolvidas em segundos."
      icon={BookOpen}
      accent="primary"
      status="soon"
    />
  );
};

export default LeiaSP;
