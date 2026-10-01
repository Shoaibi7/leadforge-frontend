import { create } from 'zustand';
import axios from 'axios';
import { User, AuthResponse, RefreshResponse } from '../types';
import { api } from '../services/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create a separate axios instance to prevent circular imports for auth entry points
const authAxios = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  registerUser: (registerData: any) => Promise<User>;
  loginUser: (loginData: any) => Promise<User>;
  logoutUser: () => Promise<void>;
  refreshTokens: () => Promise<string>;
  fetchProfile: () => Promise<User>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  // Start as true so the dashboard shows the loading spinner immediately on
  // mount/refresh, before fetchProfile has a chance to run. This prevents
  // the brief "not authenticated" flash that causes a redirect to /login.
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setAccessToken: (accessToken) => set({ accessToken }),

  // 1. REGISTER USER
  registerUser: async (registerData) => {
    set({ isLoading: true });
    try {
      const response = await authAxios.post<User>('/auth/register', registerData);
      set({ isLoading: false });
      return response.data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // 2. LOGIN USER
  loginUser: async (loginData) => {
    set({ isLoading: true });
    try {
      const response = await authAxios.post<AuthResponse>('/auth/login', loginData);
      const { accessToken, user } = response.data;
      set({
        user,
        accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
      return user;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // 3. LOGOUT USER
  logoutUser: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Failed to logout on backend', error);
    } finally {
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false, // Reset loading so auth pages show correctly after logout
      });
    }
  },

  // 4. REFRESH TOKENS (Invoked by Axios response interceptor on 401)
  refreshTokens: async () => {
    try {
      const response = await authAxios.post<RefreshResponse>('/auth/refresh');
      const { accessToken } = response.data;
      set({ accessToken });
      return accessToken;
    } catch (error) {
      // Clear auth store if refresh fails
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
      throw error;
    }
  },

  // 5. FETCH PROFILE
  // On page refresh, accessToken is lost from memory (Zustand is not persisted).
  // We first attempt a silent token refresh using the httpOnly refresh cookie,
  // then fetch the profile with the new access token.
  fetchProfile: async () => {
    set({ isLoading: true });
    try {
      // If we have no access token in memory (e.g. after a page refresh),
      // attempt a silent refresh first using the httpOnly cookie.
      const { accessToken } = get();
      if (!accessToken) {
        try {
          const refreshResponse = await authAxios.post<{ accessToken: string }>('/auth/refresh');
          set({ accessToken: refreshResponse.data.accessToken });
        } catch {
          // Refresh failed — user is not logged in, let the profile call fail naturally
          set({ isLoading: false });
          throw new Error('Session expired');
        }
      }

      const response = await api.get<User>('/auth/profile');
      const user = response.data;
      set({ user, isAuthenticated: true, isLoading: false });
      return user;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
}));
export default useAuthStore;
