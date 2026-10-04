import type { AuthResponse, AuthUser } from "./types/types";

const ACCESS_KEY = "@solicitacoes:accessToken";
const REFRESH_KEY = "@solicitacoes:refreshToken";
const USER_KEY = "@solicitacoes:user";

// Único lugar do app que sabe ONDE os tokens ficam guardados.
export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(ACCESS_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_KEY),

  getUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  },

  save(data: AuthResponse) {
    localStorage.setItem(ACCESS_KEY, data.accessToken);
    localStorage.setItem(REFRESH_KEY, data.refreshToken);
    const user: AuthUser = {
      userId: data.userId,
      name: data.name,
      email: data.email,
    };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
