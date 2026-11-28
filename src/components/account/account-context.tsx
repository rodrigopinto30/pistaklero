"use client";

import { createContext, type ReactNode, useContext } from "react";

const AccountContext = createContext<string | null>(null);

/**
 * La cuenta con la que se armó esta pestaña (el id, o null sin sesión). En un mismo navegador la
 * sesión es una sola para todas las pestañas: si en otra se entra con otra cuenta, esta queda
 * mostrando la anterior. Con este dato la pestaña se da cuenta (ver AccountWatcher) y las acciones
 * delicadas, como mandar un mensaje, no salen con la cuenta equivocada.
 */
export function AccountProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  return <AccountContext value={userId}>{children}</AccountContext>;
}

export const useAccountId = () => useContext(AccountContext);
