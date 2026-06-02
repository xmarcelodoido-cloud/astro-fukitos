import type { ReactNode } from "react";

/**
 * Shield de segurança — detecção de DevTools desativada a pedido do administrador.
 */
export const SecurityShield = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};

export default SecurityShield;
