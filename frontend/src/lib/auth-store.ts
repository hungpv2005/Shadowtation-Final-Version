import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';

export type UserRole = 'STUDENT' | 'PREMIUM_STUDENT' | 'ADMIN';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  role: UserRole;
  streakCount: number;
  premiumExpiredAt?: string | null;
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  rememberMe: boolean;
  setAuth: (user: UserProfile, accessToken: string, refreshToken: string, rememberMe?: boolean) => void;
  updateUser: (user: Partial<UserProfile>) => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

const REMEMBER_ME_KEY = 'shadowtation_remember_me';

const dynamicAuthStorage: StateStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    const isRemembered = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
    if (isRemembered) {
      return localStorage.getItem(name);
    }
    return sessionStorage.getItem(name) ?? localStorage.getItem(name);
  },

  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return;
    const isRemembered = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
    if (isRemembered) {
      localStorage.setItem(name, value);
      sessionStorage.removeItem(name);
    } else {
      sessionStorage.setItem(name, value);
      // keep a mirror in localStorage for compatibility with non-store helpers
      localStorage.setItem(name, value);
    }
  },

  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
    localStorage.removeItem(REMEMBER_ME_KEY);
    localStorage.removeItem('access_token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('student_profile');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('student_profile');
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      rememberMe: false,

      setAuth: (user, accessToken, refreshToken, rememberMe = false) => {
        if (typeof window !== 'undefined') {
          if (rememberMe) {
            localStorage.setItem(REMEMBER_ME_KEY, 'true');
          } else {
            localStorage.removeItem(REMEMBER_ME_KEY);
          }
          localStorage.setItem('access_token', accessToken);
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refresh_token', refreshToken);
          localStorage.setItem('student_profile', JSON.stringify(user));
          sessionStorage.setItem('access_token', accessToken);
          sessionStorage.setItem('accessToken', accessToken);
          sessionStorage.setItem('refresh_token', refreshToken);
          sessionStorage.setItem('student_profile', JSON.stringify(user));
          window.dispatchEvent(new Event('shadowtation:auth-change'));
        }

        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          rememberMe: Boolean(rememberMe),
        });
      },

      updateUser: (updatedUser) =>
        set((state) => {
          if (!state.user) return { user: null };
          const hasDiff = Object.keys(updatedUser).some(
            (k) => (state.user as any)?.[k] !== (updatedUser as any)[k],
          );
          if (!hasDiff) return state;

          const newUser = { ...state.user, ...updatedUser };
          if (typeof window !== 'undefined') {
            localStorage.setItem('student_profile', JSON.stringify(newUser));
            sessionStorage.setItem('student_profile', JSON.stringify(newUser));
            window.dispatchEvent(new Event('shadowtation:auth-change'));
          }
          return { user: newUser };
        }),

      updateTokens: (accessToken, refreshToken) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', accessToken);
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refresh_token', refreshToken);
          sessionStorage.setItem('access_token', accessToken);
          sessionStorage.setItem('accessToken', accessToken);
          sessionStorage.setItem('refresh_token', refreshToken);
          window.dispatchEvent(new Event('shadowtation:auth-change'));
        }

        set({
          accessToken,
          refreshToken,
        });
      },

      logout: () => {
        dynamicAuthStorage.removeItem('shadowtation-auth-storage');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('student_profile');
          sessionStorage.removeItem('access_token');
          sessionStorage.removeItem('accessToken');
          sessionStorage.removeItem('refresh_token');
          sessionStorage.removeItem('student_profile');
          window.dispatchEvent(new Event('shadowtation:auth-change'));
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          rememberMe: false,
        });
      },
    }),
    {
      name: 'shadowtation-auth-storage',
      storage: createJSONStorage(() => dynamicAuthStorage),
    },
  ),
);
