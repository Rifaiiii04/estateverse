// Type definitions for authentication and user accounts.

export type UserRole = "seller" | "admin";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
