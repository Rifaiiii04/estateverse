// Custom API error representing structured backend failures.
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8085/api/v1";

// Resolves an API endpoint (relative to /api/v1) into a full request URL.
export function apiUrl(endpoint: string): string {
  return endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
}

// Executes HTTP fetch requests with credentials, security headers, and uniform JSON parsing.
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = apiUrl(endpoint);
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiError(
      "Tidak dapat terhubung ke server. Periksa koneksi internet Anda lalu coba lagi.",
      0
    );
  }

  const contentType = response.headers.get("content-type");
  let data: { success?: boolean; data?: T; error?: string } = {};

  if (contentType && contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = {};
    }
  }

  if (!response.ok) {
    const errorMsg = data.error || `Request failed with status ${response.status}`;
    throw new ApiError(errorMsg, response.status);
  }

  return (data.data !== undefined ? data.data : data) as T;
}

// Converts a relative storage path into an absolute public media URL.
export function getMediaUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const backendOrigin = API_BASE_URL.replace("/api/v1", "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${backendOrigin}${cleanPath}`;
}
