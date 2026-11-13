import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { useSQLiteContext } from 'expo-sqlite';

import { findUserById, findUserCredentials, insertUser } from '@/db/userRepository';
import type { LoginInput, RegisterInput, User } from '@/types/auth';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<{ success: boolean; error?: string }>;
  register: (input: RegisterInput) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AUTH_USER_KEY = 'estateverse_active_user_id';
const AuthContext = createContext<AuthContextValue | null>(null);

// Converts random bytes to a lowercase hex string.
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

// Computes a SHA-256 hash from a password and salt.
async function hashPassword(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password + salt);
}

// Manages seller authentication and persists the active session ID.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restores any saved seller session from secure storage on mount.
    async function restoreSession() {
      try {
        const storedId = await SecureStore.getItemAsync(AUTH_USER_KEY);
        if (storedId) {
          const found = await findUserById(db, Number.parseInt(storedId, 10));
          if (found) setUser(found);
        }
      } catch {
        // Fallback silently if secure storage is unavailable on web
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, [db]);

  // Validates credentials and logs the seller in.
  const login = async (input: LoginInput) => {
    const trimmedEmail = input.email.trim().toLowerCase();
    const creds = await findUserCredentials(db, trimmedEmail);
    if (!creds) {
      return { success: false, error: 'Email atau kata sandi tidak cocok' };
    }
    const computedHash = await hashPassword(input.password, creds.password_salt);
    if (computedHash !== creds.password_hash) {
      return { success: false, error: 'Email atau kata sandi tidak cocok' };
    }
    const loggedInUser: User = { id: creds.id, name: creds.name, email: creds.email };
    setUser(loggedInUser);
    try {
      await SecureStore.setItemAsync(AUTH_USER_KEY, String(creds.id));
    } catch {
      // Ignore web storage limitation
    }
    return { success: true };
  };

  // Registers a new seller account and logs them in immediately.
  const register = async (input: RegisterInput) => {
    const trimmedEmail = input.email.trim().toLowerCase();
    const trimmedName = input.name.trim();
    if (!trimmedName || !trimmedEmail || !input.password) {
      return { success: false, error: 'Semua kolom wajib diisi' };
    }
    const existing = await findUserCredentials(db, trimmedEmail);
    if (existing) {
      return { success: false, error: 'Email ini sudah terdaftar' };
    }
    const salt = toHex(await Crypto.getRandomBytesAsync(16));
    const hash = await hashPassword(input.password, salt);
    const newId = await insertUser(db, trimmedName, trimmedEmail, hash, salt);
    const newUser: User = { id: newId, name: trimmedName, email: trimmedEmail };
    setUser(newUser);
    try {
      await SecureStore.setItemAsync(AUTH_USER_KEY, String(newId));
    } catch {
      // Ignore web storage limitation
    }
    return { success: true };
  };

  // Clears the active session and logs the seller out.
  const logout = async () => {
    setUser(null);
    try {
      await SecureStore.deleteItemAsync(AUTH_USER_KEY);
    } catch {
      // Ignore storage error
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Consumes the current seller authentication context.
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
