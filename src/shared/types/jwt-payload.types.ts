import { AuthContext, CompanyRole, SchoolRole } from '../enums';

export interface JwtPayload {
  sub: string;
  email?: string;
  phone?: string;
  role: CompanyRole | SchoolRole;
  school_id?: string;
  context: AuthContext;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  token_id: string;
  context: AuthContext;
  iat?: number;
  exp?: number;
}

export interface RequestUser extends JwtPayload {
  userId: string;
}
