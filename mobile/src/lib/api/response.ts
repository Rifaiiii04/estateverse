// ApiError carries a safe API failure without exposing raw proxy pages or server output.
export class ApiError extends Error {
  status: number;
  // Constructs a server-status-aware error for native forms and session handling.
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// responseError explains common non-JSON responses such as an old backend's plain-text 404.
function responseError(status: number): ApiError {
  if (status === 404) return new ApiError('Layanan API tidak ditemukan. Pastikan backend terbaru sudah berjalan dan alamat server aplikasi benar.', status);
  if (status === 401) return new ApiError('Sesi tidak valid atau sudah berakhir. Silakan login kembali.', status);
  if (status >= 500) return new ApiError('Server sedang bermasalah. Coba lagi setelah beberapa saat.', status);
  return new ApiError('Respons server tidak sesuai format aplikasi. Periksa alamat server dan koneksi Anda.', status);
}

// decodeApiResponse validates the API envelope before returning data and tolerates JSON error bodies sent as plain text.
export async function decodeApiResponse<T>(response: Pick<Response, 'text' | 'status' | 'ok'>): Promise<T> {
  const text = await response.text();
  let body: unknown;
  try { body = JSON.parse(text); }
  catch { throw responseError(response.status); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw responseError(response.status);
  const envelope = body as { success?: boolean; data?: T; error?: unknown };
  if (!response.ok || envelope.success === false) {
    throw typeof envelope.error === 'string' && envelope.error.trim()
      ? new ApiError(envelope.error, response.status) : responseError(response.status);
  }
  if (envelope.success !== true || !Object.hasOwn(envelope, 'data')) throw responseError(response.status);
  return envelope.data as T;
}
