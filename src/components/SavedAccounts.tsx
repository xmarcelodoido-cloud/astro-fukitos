import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SavedAccount {
  ra: string;
  studentName: string;
  savedAt: string;
}

interface SavedAccountsProps {
  onSelectAccount: (ra: string) => void;
  currentRa?: string;
}

const LOCAL_STORAGE_KEY = "fukitos_saved_accounts";

export function SavedAccounts({ onSelectAccount, currentRa }: SavedAccountsProps) {
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = () => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        setAccounts(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading saved accounts:", error);
    }
  };

  const removeAccount = (ra: string) => {
    const updated = accounts.filter((acc) => acc.ra !== ra);
    setAccounts(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  };

  if (accounts.length === 0) {
    return null;
  }

  return (
    <div className="w-full mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full px-4 py-2 bg-secondary/50 rounded-lg text-sm text-foreground hover:bg-secondary/70 transition-colors"
      >
        <span className="flex items-center gap-2">
          <User className="w-4 h-4" />
          Contas Salvas ({accounts.length})
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              {accounts.map((account) => (
                <motion.div
                  key={account.ra}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                    currentRa === account.ra
                      ? "bg-primary/10 border-primary/30"
                      : "bg-background border-border"
                  }`}
                >
                  <button
                    onClick={() => onSelectAccount(account.ra)}
                    className="flex-1 text-left"
                  >
                    <p className="font-medium text-sm text-foreground">
                      {account.studentName}
                    </p>
                    <p className="text-xs text-muted-foreground">{account.ra}</p>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAccount(account.ra);
                    }}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function saveAccount(ra: string, studentName: string) {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    const accounts: SavedAccount[] = saved ? JSON.parse(saved) : [];
    
    // Check if account already exists
    const existingIndex = accounts.findIndex((acc) => acc.ra === ra);
    if (existingIndex >= 0) {
      // Update existing account
      accounts[existingIndex] = {
        ra,
        studentName,
        savedAt: new Date().toISOString(),
      };
    } else {
      // Add new account
      accounts.unshift({
        ra,
        studentName,
        savedAt: new Date().toISOString(),
      });
    }

    // Keep only last 10 accounts
    const trimmed = accounts.slice(0, 10);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error("Error saving account:", error);
  }
}

export function getSavedAccountPassword(ra: string): string | null {
  // Note: We don't save passwords in localStorage for security
  // This is just a placeholder if needed for future implementation
  return null;
}
