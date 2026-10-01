export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface UserAuthPayload {
  userId: string;
  mobile?: string | null;
  email?: string | null;
  name: string;
}

export interface AdminAuthPayload {
  adminId: string;
  email: string;
  name: string;
  role: string;
}
