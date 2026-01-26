import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WarningScreenProps {
  reason: string;
  warnedAt?: string;
  onAcknowledge: () => Promise<boolean>;
  onBack: () => void;
}

export function WarningScreen({ reason, warnedAt, onAcknowledge, onBack }: WarningScreenProps) {
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  const handleAcknowledge = async () => {
    setIsAcknowledging(true);
    const success = await onAcknowledge();
    setIsAcknowledging(false);
    
    if (!success) {
      // If acknowledgment failed, still allow back
      onBack();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="w-20 h-20 mx-auto mb-6 bg-yellow-500/20 rounded-full flex items-center justify-center"
        >
          <AlertTriangle className="w-10 h-10 text-yellow-500" />
        </motion.div>

        <h1 className="text-2xl font-bold text-yellow-500 mb-4">
          Aviso Importante
        </h1>

        <p className="text-foreground/80 mb-4">
          Você recebeu um aviso da administração. Por favor, leia atentamente.
        </p>

        <div className="bg-background/50 rounded-lg p-4 mb-6">
          <p className="text-sm text-muted-foreground mb-1">Motivo:</p>
          <p className="text-foreground font-medium">{reason}</p>
          
          {warnedAt && (
            <>
              <p className="text-sm text-muted-foreground mt-3 mb-1">Data do aviso:</p>
              <p className="text-foreground text-sm">
                {new Date(warnedAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Ao continuar, você confirma que leu e entendeu este aviso. Caso o comportamento se repita, você poderá ser banido.
        </p>

        <div className="flex flex-col gap-3">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={handleAcknowledge}
              disabled={isAcknowledging}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {isAcknowledging ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Eu entendi, continuar
                </span>
              )}
            </Button>
          </motion.div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onBack}
            className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium"
          >
            Voltar
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
