/**
 * Detecta se o site está rodando no ambiente de edição (preview do Lovable,
 * localhost ou dentro de um iframe do editor). Nesses casos as proteções
 * anti-DevTools ficam desligadas para o dono conseguir ver e editar o site.
 * O site publicado (astroghub.lovable.app / domínio próprio) continua protegido.
 */
const BAN_KEYS = ["astrokitos_banned", "astrokitos_devtools_attempts"];

export const isDevEnvironment = (): boolean => {
  if (typeof window === "undefined") return false;
  if (import.meta.env.DEV) return true;
  const h = window.location.hostname;
  if (
    h === "localhost" ||
    h.startsWith("127.") ||
    h.startsWith("id-preview--") ||
    h.startsWith("preview--") ||
    h.endsWith(".lovableproject.com") ||
    h.endsWith("lovable.dev")
  ) return true;
  try {
    if (window.self !== window.top) return true; // dentro do editor
  } catch {
    return true;
  }
  return false;
};

export const DEV_ENV = isDevEnvironment();

// No ambiente de edição, limpa qualquer banimento antigo salvo no navegador.
if (DEV_ENV) {
  try { BAN_KEYS.forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
}
