export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  userId: string;
  name: string;
  email: string;
}

export interface AuthUser {
  userId: string;
  name: string;
  email: string;
}
