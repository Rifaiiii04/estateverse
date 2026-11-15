import React, { createContext, useContext, useEffect, useState } from 'react';
import { currentSeller, loginSeller, logoutSeller, registerSeller } from '@/lib/api/auth';
import { ApiError, saveSession } from '@/lib/api/client';
import type { LoginInput, RegisterInput, User } from '@/types/auth';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<{ success: boolean; error?: string }>;
  register: (input: RegisterInput) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);

// AuthProvider shares backend seller identities with web and protects native sessions using SecureStore.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    currentSeller().then((seller) => { if (active) setUser(seller); }).catch(async (error) => {
      if (error instanceof ApiError && error.status === 401) await saveSession(null);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  // authenticate updates the UI only after the backend accepts the account credentials.
  const authenticate = async (action: () => Promise<User>) => {
    try { setUser(await action()); return { success: true }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Tidak dapat terhubung ke server.' }; }
  };
  // login opens a native session for an existing backend seller.
  const login = (input: LoginInput) => authenticate(() => loginSeller(input));
  // register creates a backend seller account and signs it in.
  const register = (input: RegisterInput) => authenticate(() => registerSeller(input));
  // logout clears the UI even if revocation cannot reach the backend.
  const logout = async () => {
    try { await logoutSeller(); } catch { /* logoutSeller already cleared the credential store. */ }
    finally { setUser(null); }
  };
  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

// useAuth reads the current backend seller session for protected mobile screens.
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
