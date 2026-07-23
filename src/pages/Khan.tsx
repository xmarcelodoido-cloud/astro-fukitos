import { Sparkles } from "lucide-react";
import { PlatformShell } from "@/components/PlatformShell";
import { useAntiInspect } from "@/hooks/useAntiInspect";

const Khan = () => {
  useAntiInspect();
  return (
    <PlatformShell
      name="Khan Academy"
      tagline="Resolução automática de exercícios da Khan Academy."
      icon={Sparkles}
      accent="accent"
      status="soon"
    />
  );
};

export default Khan;
