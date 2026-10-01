export interface User {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
}
