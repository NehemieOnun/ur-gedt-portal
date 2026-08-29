const ACCESS_TOKEN_KEY = "urgedt_access_token";
const REFRESH_TOKEN_KEY = "urgedt_refresh_token";

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setTokens(accessToken: string, refreshToken?: string) {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  } catch {
    // ignore storage errors
  }
}

export function clearTokens() {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
}

/**
 * Full local session reset — clears auth tokens plus every app-related localStorage
 * key (cached session object, offline DB cache, sync queue). Used when a stale
 * cached session is suspected of masking a real permission/role change made on
 * the server, since permissions are only refreshed at login time, not live.
 */
export function clearFullLocalSession() {
  clearTokens();
  try {
    const keysToRemove = [
      "urgedt_session",
      "urgedt_offline_db",
      "urgedt_offline_finance_queue",
      "urgedt_last_sync_time"
    ];
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore storage errors
  }
}

async function tryRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch("/api/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken })
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.success && data?.accessToken) {
      setTokens(data.accessToken);
      return data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Caches a snapshot of the app database to localStorage for instant-paint on next
 * load. Deferred via setTimeout so the (potentially expensive) JSON.stringify never
 * blocks the current click/render — a large uploaded photo/video embedded as base64
 * inside the data can otherwise freeze the tab for several seconds ("page not
 * responding"). Also strips any oversized base64 data URIs before stringifying,
 * since this cache is only a convenience snapshot, not the source of truth — the
 * server always has the real data, so losing a bulky embedded preview from the
 * local cache is an acceptable tradeoff for staying responsive.
 */
export function cacheDbSnapshot(data: any) {
  setTimeout(() => {
    try {
      const MAX_INLINE_LENGTH = 100_000; // ~100KB per string field
      const stripLargeStrings = (value: any): any => {
        if (typeof value === "string") {
          return value.startsWith("data:") && value.length > MAX_INLINE_LENGTH
            ? "[média volumineux omis du cache local]"
            : value;
        }
        if (Array.isArray(value)) return value.map(stripLargeStrings);
        if (value && typeof value === "object") {
          const out: any = {};
          for (const key of Object.keys(value)) out[key] = stripLargeStrings(value[key]);
          return out;
        }
        return value;
      };
      const safeData = stripLargeStrings(data);
      localStorage.setItem("urgedt_offline_db", JSON.stringify(safeData));
    } catch {
      // Cache is best-effort — quota errors or serialization issues are never fatal.
    }
  }, 0);
}

/**
 * Wraps fetch(): attaches the Bearer access token to every request automatically,
 * and retries once after a silent token refresh on a 401.
 */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(init.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let res = await fetch(input, { ...init, headers });

  if (res.status === 401 && token) {
    const newToken = await tryRefresh();
    if (newToken) {
      const retryHeaders = new Headers(init.headers || {});
      retryHeaders.set("Authorization", `Bearer ${newToken}`);
      res = await fetch(input, { ...init, headers: retryHeaders });
    }
  }

  return res;
}
