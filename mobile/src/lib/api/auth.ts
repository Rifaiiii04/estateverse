import { api, saveSession } from './client';
import type { LoginInput, RegisterInput, User } from '@/types/auth';

// loginSeller authenticates against the same account database as the web application.
export async function loginSeller(input: LoginInput): Promise<User> {
  const result = await api<{ user: User; token: string }>('/auth/mobile/login', { method: 'POST', body: JSON.stringify(input) });
  await saveSession(result.token);
  return result.user;
}

// registerSeller creates a backend account before opening a native server session.
export async function registerSeller(input: RegisterInput): Promise<User> {
  await api('/auth/register', { method: 'POST', body: JSON.stringify({ ...input, confirm_password: input.password }) });
  return loginSeller(input);
}

// currentSeller validates the stored bearer session with the server instead of trusting a local user id.
export function currentSeller(): Promise<User> { return api<User>('/auth/me'); }

// logoutSeller revokes the server session and always removes its local credentials.
export async function logoutSeller() {
  try { await api('/auth/logout', { method: 'POST' }); }
  finally { await saveSession(null); }
}
