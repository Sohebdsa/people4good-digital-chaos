import { create } from 'zustand';

/**
 * Optional sign-in. Participants never need an account: they just enter a name (or play as a guest).
 * Admin login is for facilitators only and unlocks leaderboard management.
 *
 * DEMO ONLY: the admin password is hardcoded (here and in server/leaderboard.mjs) because this is a
 * small workshop demo. The repository is public, so treat it as known to everyone. For real use,
 * start the server with ADMIN_TOKEN=<secret> and log in with that secret instead.
 */
export const DEMO_ADMIN_PASSWORD = 'p4g-admin-2026';

const BASE = ((import.meta.env.VITE_LEADERBOARD_URL as string | undefined) ?? '').replace(/\/$/, '');
const KEY = 'p4g-digital-chaos:admin';

function readToken(): string | null {
  try {
    return sessionStorage.getItem(KEY); // per tab, cleared when the browser tab closes
  } catch {
    return null;
  }
}

interface AuthState {
  adminToken: string | null;
  setToken: (t: string | null) => void;
}

export const useAuth = create<AuthState>((set) => ({
  adminToken: readToken(),
  setToken: (adminToken) => {
    try {
      if (adminToken) sessionStorage.setItem(KEY, adminToken);
      else sessionStorage.removeItem(KEY);
    } catch {
      /* storage unavailable: session lasts until reload */
    }
    set({ adminToken });
  },
}));

export const useIsAdmin = () => useAuth((s) => !!s.adminToken);
export const adminToken = () => useAuth.getState().adminToken;

/**
 * Check the password with the leaderboard server. If the server can't be reached (offline demo),
 * fall back to the built-in demo password so admins can still manage this device's board.
 */
export async function loginAdmin(password: string): Promise<{ ok: boolean; error?: string; offline?: boolean }> {
  if (!password) return { ok: false, error: 'Enter the admin password.' };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`${BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
      signal: ctrl.signal,
    }).finally(() => clearTimeout(t));
    if (res.status >= 500) throw new Error('server error');
    if (res.ok) {
      useAuth.getState().setToken(password);
      return { ok: true };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data.error ?? 'Wrong admin password.' };
  } catch {
    if (password === DEMO_ADMIN_PASSWORD) {
      useAuth.getState().setToken(password);
      return { ok: true, offline: true };
    }
    return { ok: false, error: 'Wrong admin password (leaderboard server offline).' };
  }
}

export function logoutAdmin() {
  useAuth.getState().setToken(null);
}
