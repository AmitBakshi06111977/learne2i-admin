// Admin API client.
//
// All calls go to the same .NET backend, but we use a separate auth
// flow (admin login → JWT) and a separate token key in localStorage
// (`learne2i_admin_token`) so the admin session never collides with
// the user-facing app's session.

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
export { API_BASE };
const TOKEN_KEY = "learne2i_admin_token";
const ADMIN_KEY = "learne2i_admin_user";

export interface ApiOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
  /** Skip attaching the admin token (for the login endpoint). */
  anonymous?: boolean;
  /** If true, don't throw on non-2xx — just return undefined. */
  swallowError?: boolean;
}

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(t: string | null) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
}
export function getAdminUser<T = any>(): T | null {
  try {
    const s = localStorage.getItem(ADMIN_KEY);
    return s ? JSON.parse(s) as T : null;
  } catch { return null; }
}
export function setAdminUser<T = any>(u: T | null) {
  try {
    if (u) localStorage.setItem(ADMIN_KEY, JSON.stringify(u));
    else localStorage.removeItem(ADMIN_KEY);
  } catch { /* ignore */ }
}
export function clearAdminSession() {
  setToken(null);
  setAdminUser(null);
}

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { anonymous, swallowError, headers: extraHeaders, ...rest } = opts;
  const headers: Record<string, string> = { ...(extraHeaders ?? {}) };
  if (!anonymous) {
    const t = getToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }
  if (rest.body && !headers["Content-Type"] && !(rest.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  let r: Response;
  try {
    r = await fetch(`${API_BASE}${path}`, { ...rest, headers });
  } catch (e: any) {
    // Network-level failure (CORS, connection reset, backend down, etc.).
    // Surface the actual error so the UI can show something useful.
    if (swallowError) return undefined as T;
    throw new Error(`Network error: ${e?.message || "could not reach the API"}`);
  }

  if (r.status === 401 && !anonymous) {
    // Token expired or invalid — clear session so the UI redirects to login
    clearAdminSession();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login?expired=1";
    }
    throw new Error("Session expired");
  }
  if (!r.ok) {
    let detail = "";
    try { const j = await r.json(); detail = j?.message || j?.error || ""; } catch { /* noop */ }
    const msg = detail || `${r.status} ${r.statusText}`;
    if (swallowError) return undefined as T;
    throw new Error(msg);
  }
  if (r.status === 204) return undefined as T;
  const text = await r.text();
  if (!text) return undefined as T;
  try { return JSON.parse(text) as T; }
  catch { return text as T; }
}

// Convenience helpers
export const apiGet  = <T = unknown>(p: string, opts?: ApiOptions) => api<T>(p, { method: "GET",  ...(opts ?? {}) });
export const apiPost = <T = unknown>(p: string, body?: unknown, opts?: ApiOptions) =>
  api<T>(p, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined, ...(opts ?? {}) });
export const apiPut  = <T = unknown>(p: string, body?: unknown, opts?: ApiOptions) =>
  api<T>(p, { method: "PUT",  body: body !== undefined ? JSON.stringify(body) : undefined, ...(opts ?? {}) });
export const apiDel  = <T = unknown>(p: string, opts?: ApiOptions) => api<T>(p, { method: "DELETE", ...(opts ?? {}) });
