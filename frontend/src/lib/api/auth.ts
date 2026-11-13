import { apiClient } from "./client";
import { LoginInput, RegisterInput, User } from "@/types/auth";

// Registers a new seller account via the backend API.
export async function registerUser(input: RegisterInput): Promise<User> {
  return apiClient<User>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// Authenticates seller credentials and sets server-side session cookie.
export async function loginUser(
  input: LoginInput
): Promise<{ user: User; expires: string }> {
  return apiClient<{ user: User; expires: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// Invalidates active session on the server and clears authentication cookie.
export async function logoutUser(): Promise<{ message: string }> {
  return apiClient<{ message: string }>("/auth/logout", {
    method: "POST",
  });
}

// Retrieves profile information of currently authenticated seller.
export async function getCurrentUser(): Promise<User> {
  return apiClient<User>("/auth/me", {
    method: "GET",
  });
}
