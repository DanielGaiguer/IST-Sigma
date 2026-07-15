"use client";

import { createContext, useContext } from "react";

type User = {
  id: string;
  nome: string;
  email: string;
  perfil: "admin" | "tecnico";
};

const UserContext = createContext<User | null>(null);

export function UserProvider({ user, children }: { user: User; children: React.ReactNode }) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
