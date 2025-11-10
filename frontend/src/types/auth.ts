export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface AuthData {
  access_token: string;
  user: User;
}

export interface AuthResponse {
  success: boolean;
  data: AuthData | null;
  error: string | null;
}

export interface SignupRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LogoutData {
  message: string;
}

export interface LogoutResponse {
  success: boolean;
  data: LogoutData | null;
  error: string | null;
}

export interface CurrentUserResponse {
  success: boolean;
  data: User | null;
  error: string | null;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  signup: (credentials: SignupRequest) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}
