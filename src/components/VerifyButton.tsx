import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";

interface VerifyButtonProps {
  onVerified: () => void;
  isVerified: boolean;
}

export function VerifyButton({ onVerified, isVerified }: VerifyButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    if (isVerified || isLoading) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onVerified();
    }, 2000);
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={`
        flex items-center justify-center gap-3 px-6 py-4 rounded-md
        border-2 cursor-pointer select-none font-medium text-lg
        transition-all duration-300 w-full
        ${isVerified
          ? "bg-primary border-primary text-primary-foreground"
          : "bg-primary-foreground border-muted text-background hover:border-muted-foreground hover:bg-muted"
        }
      `}
    >
      <div
        className={`
          w-5 h-5 border-2 rounded-sm flex items-center justify-center
          transition-all duration-200
          ${isVerified
            ? "bg-primary-foreground border-primary-foreground"
            : "border-muted-foreground"
          }
        `}
      >
        {isLoading ? (
          <Loader2 className="w-3 h-3 text-primary animate-spin-slow" />
        ) : isVerified ? (
          <Check className="w-3 h-3 text-primary font-bold" />
        ) : null}
      </div>
      <span>
        {isLoading ? "" : isVerified ? "Verificado ✅" : "SOU HUMANO"}
      </span>
    </motion.button>
  );
}
