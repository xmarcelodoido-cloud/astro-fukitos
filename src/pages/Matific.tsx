import { Calculator } from "lucide-react";
import { PlatformShell } from "@/components/PlatformShell";
import { useAntiInspect } from "@/hooks/useAntiInspect";

const Matific = () => {
  useAntiInspect();
  return (
    <PlatformShell
      name="Matific"
      tagline="Resolve automaticamente as atividades de matemática do Matific."
      icon={Calculator}
      accent="primary"
      status="soon"
    />
  );
};

export default Matific;
