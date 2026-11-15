import { File } from 'expo-file-system';
import { api, API_URL } from './client';

// uploadListingImage uploads local photos while retaining existing validated backend media paths.
export async function uploadListingImage(uri: string): Promise<string> {
  const origin = API_URL.replace(/\/api\/v1$/, '');
  if (uri.startsWith(`${origin}/api/v1/storage/images/`)) return uri.slice(origin.length);
  if (uri.startsWith('/api/v1/storage/images/')) return uri;
  if (/^https?:\/\//.test(uri)) throw new Error('Unggah foto dari perangkat, bukan tautan gambar eksternal.');
  const form = new FormData();
  form.append('image', new File(uri));
  const result = await api<{ path: string }>('/upload/image', { method: 'POST', body: form });
  return result.path;
}
