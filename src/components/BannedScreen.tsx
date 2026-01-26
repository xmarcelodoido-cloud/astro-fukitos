import { motion } from "framer-motion";
import { ShieldX } from "lucide-react";

interface BannedScreenProps {
  reason: string;
  bannedAt?: string;
  onBack: () => void;
}

export function BannedScreen({ reason, bannedAt, onBack }: BannedScreenProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-destructive/10 border border-destructive/30 rounded-xl p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="w-20 h-20 mx-auto mb-6 bg-destructive/20 rounded-full flex items-center justify-center"
        >
          <ShieldX className="w-10 h-10 text-destructive" />
        </motion.div>

        <h1 className="text-2xl font-bold text-destructive mb-4">
          Conta Banida
        </h1>

        <p className="text-foreground/80 mb-4">
          Seu RA foi banido do sistema por violar as regras de uso.
        </p>

        <div className="bg-background/50 rounded-lg p-4 mb-6">
          <p className="text-sm text-muted-foreground mb-1">Motivo:</p>
          <p className="text-foreground font-medium">{reason}</p>
          
          {bannedAt && (
            <>
              <p className="text-sm text-muted-foreground mt-3 mb-1">Data do banimento:</p>
              <p className="text-foreground text-sm">
                {new Date(bannedAt).toLocaleDateString('pt-BR', {
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
          Se você acredita que isso foi um erro, entre em contato através do Discord.
        </p>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBack}
          className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium"
        >
          Voltar
        </motion.button>
      </motion.div>
    </div>
  );
}
