import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DEMO_USERS } from '@/auth/demoUsers';
import { can, type Permission } from '@/auth/permissions';
import type { AuthUser, UserRole } from '@/types';

const STORAGE_KEY = 'kili-vault-auth';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  login: (role: UserRole) => void;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => loadStoredUser());
  const isDemoMode = import.meta.env.VITE_DEMO_MODE !== 'false';

  const login = useCallback((role: UserRole) => {
    const demo = DEMO_USERS[role];
    const next: AuthUser = {
      id: demo.id,
      name: demo.name,
      role: demo.role,
      title: demo.title,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setUser(next);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const hasPermission = useCallback(
    (permission: Permission) => (user ? can(user.role, permission) : false),
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isDemoMode,
      login,
      logout,
      hasPermission,
    }),
    [user, isDemoMode, login, logout, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function getRoleHomePath(role: UserRole): string {
  return DEMO_USERS[role].homePath;
}
