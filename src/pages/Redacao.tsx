import { PenSquare } from "lucide-react";
import { PlatformShell } from "@/components/PlatformShell";
import { useAntiInspect } from "@/hooks/useAntiInspect";

const Redacao = () => {
  useAntiInspect();
  return (
    <PlatformShell
      name="Redação"
      tagline="Gera e envia redações como rascunho direto na Sala do Futuro."
      icon={PenSquare}
      accent="accent"
      status="soon"
    />
  );
};

export default Redacao;
