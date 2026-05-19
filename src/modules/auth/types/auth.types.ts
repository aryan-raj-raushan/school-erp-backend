export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  role: string;
  schoolId?: string;
  context: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}
