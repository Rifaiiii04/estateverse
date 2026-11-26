const DEFAULT_AFTER_LOGIN = "/dashboard";
const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];

// safeNextPath accepts only same-site paths (no "//host", "/\host", or schemes) so ?next= cannot redirect off-site.
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return DEFAULT_AFTER_LOGIN;
  if (/[\u0000-\u001f]/.test(raw)) return DEFAULT_AFTER_LOGIN;
  const path = raw.split(/[?#]/)[0];
  return AUTH_PAGES.includes(path) ? DEFAULT_AFTER_LOGIN : raw;
}

// nextPathFromLocation reads ?next= from the current address bar (browser only).
export function nextPathFromLocation(): string {
  if (typeof window === "undefined") return DEFAULT_AFTER_LOGIN;
  return safeNextPath(new URLSearchParams(window.location.search).get("next"));
}

// loginUrlFor builds the sign-in link that returns to the given page afterwards.
export function loginUrlFor(path: string): string {
  return `/login?next=${encodeURIComponent(safeNextPath(path))}`;
}
