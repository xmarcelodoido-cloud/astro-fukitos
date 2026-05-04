import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Sparkles } from "lucide-react";

const STORAGE_KEY = "astrokitos_donation_seen";

export function EntryDonationModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) !== "1") {
        setTimeout(() => setIsOpen(true), 600);
      }
    } catch {
      setIsOpen(true);
    }
  }, []);

  const close = () => {
    try { sessionStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9998] flex items-center justify-center p-4"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="bg-card border border-primary/30 rounded-2xl p-6 w-full max-w-sm card-shadow relative"
            style={{
              boxShadow:
                "0 10px 40px -10px rgba(251,161,44,0.35), 0 0 0 1px rgba(251,161,44,0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={close}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center mb-3">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "var(--gradient-brand)" }}
              >
                <Sparkles className="w-7 h-7 text-white" />
              </div>
            </div>

            <h3 className="text-2xl font-bold text-center mb-2 font-bricolage">
              <span className="text-gradient">Ajude o Astrokitos!</span>
            </h3>

            <p className="text-sm text-foreground/90 text-center mb-3 leading-relaxed">
              Sua doação ajuda a manter o <span className="text-primary font-semibold">site</span> e
              a <span className="text-primary font-semibold">IA tutora</span> que eu mesmo criei.
            </p>

            <p className="text-xs text-muted-foreground text-center mb-5 leading-relaxed">
              Feito com 💛 por <span className="text-primary font-semibold">Zenos</span>.
              Qualquer valor mantém o projeto vivo e gratuito para todos.
            </p>

            <motion.a
              href="https://pixgg.com/zenin"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-2 w-full text-white py-3 px-4 rounded-xl font-semibold text-base transition-opacity hover:opacity-90"
              style={{ background: "var(--gradient-brand)" }}
              onClick={close}
            >
              <Heart className="w-5 h-5" />
              Doar Agora
            </motion.a>

            <button
              onClick={close}
              className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Talvez depois
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default EntryDonationModal;
