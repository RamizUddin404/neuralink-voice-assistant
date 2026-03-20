'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  user: any;
  loading: boolean;
  signIn: () => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: { uid: 'guest', displayName: 'Guest User', email: 'guest@example.com' },
  loading: false,
  signIn: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Always logged in as a guest
  const [user] = useState<any>({ uid: 'guest', displayName: 'Guest User', email: 'guest@example.com' });
  const [loading] = useState(false);

  return (
    <AuthContext.Provider value={{ user, loading, signIn: async () => {}, signOut: async () => {} }}>
      {children}
    </AuthContext.Provider>
  );
}
