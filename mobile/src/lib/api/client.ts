import Constants from 'expo-constants';
import { fetch } from 'expo/fetch';
import * as SecureStore from 'expo-secure-store';
import { decodeApiResponse } from './response';
export { ApiError } from './response';

const TOKEN_KEY = 'estateverse_server_session';
const developmentHost = Constants.expoConfig?.hostUri?.split(':')[0] || 'localhost';
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || `http://${developmentHost}:8085/api/v1`).replace(/\/$/, '');

// saveSession stores native bearer tokens only in the OS-protected credential store.
export async function saveSession(token: string | null) {
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// api sends JSON or multipart requests to the shared Go API with the native server session.
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Endpoint API tidak valid.');
  if (!__DEV__ && !API_URL.startsWith('https://')) throw new Error('Alamat API produksi harus menggunakan HTTPS.');
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const headers = new Headers(options.headers);
  headers.set('Cache-Control', 'no-store');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (typeof options.body === 'string') headers.set('Content-Type', 'application/json');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(`${API_URL}${path}`, { ...options, credentials: 'omit', headers, signal: controller.signal });
    return await decodeApiResponse<T>(response);
  } finally { clearTimeout(timer); }
}

// mediaUrl resolves backend media paths without pointing at the phone's localhost.
export function mediaUrl(path: string): string {
  return /^https?:\/\//.test(path) ? path : `${API_URL.replace(/\/api\/v1$/, '')}${path}`;
}
