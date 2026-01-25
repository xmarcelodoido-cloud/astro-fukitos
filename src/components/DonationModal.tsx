import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart } from "lucide-react";

export function DonationModal() {
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    // Show modal on mount
    setIsOpen(true);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="bg-card border border-border rounded-xl p-6 w-full max-w-xs card-shadow relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-2xl font-bold text-center mb-3">
              <span className="text-gradient">Ajude o site!</span>
            </h3>

            <p className="text-sm text-foreground text-center mb-3 leading-relaxed">
              Sua doação mantém nossa plataforma online e em funcionamento.
            </p>

            <p className="text-sm text-foreground text-center mb-4 leading-relaxed">
              Ajude o script a continuar GRATUITAMENTE e a permanecer vivo doando qualquer valor :D
            </p>

            <motion.a
              href="https://pixgg.com/zenin"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-2 w-full bg-primary-foreground text-background py-3 px-4 rounded-lg font-semibold text-base hover:bg-muted transition-colors"
            >
              <Heart className="w-5 h-5 text-destructive" />
              Doar Agora
            </motion.a>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
