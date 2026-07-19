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

export interface PasswordSetupRequired {
  needs_password_setup: true;
  setup_token: string;
}

export interface PasswordChangeRequired {
  must_change_password: true;
  change_token: string;
}

export type LoginOrSetupResponse = LoginResponse | PasswordSetupRequired | PasswordChangeRequired;
