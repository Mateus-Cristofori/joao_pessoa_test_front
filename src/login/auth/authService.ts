import { api } from "../../api/api";
import { tokenStorage } from "./tokenStorage";
import type { AuthResponse } from "./types/types";

export const authService = {
  async login(username: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/login", {
      username,
      password,
    });

    tokenStorage.save(data);
    return data;
  },

  logout() {
    tokenStorage.clear();
  },
};
