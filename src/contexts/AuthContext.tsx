/**
 * Authentication Context
 *
 * Provides authentication state and methods to the entire app.
 * Handles token refresh and user session management.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  type User,
  type LoginCredentials,
  login as apiLogin,
  logout as apiLogout,
  getCurrentUser,
  refreshAccessToken,
  isLoggedIn,
  clearTokens,
  AuthError,
} from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current user on mount (if logged in)
  const fetchUser = useCallback(async () => {
    if (!isLoggedIn()) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (error) {
      if (error instanceof AuthError && error.status === 401) {
        // Token expired - try to refresh
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          try {
            const userData = await getCurrentUser();
            setUser(userData);
            return;
          } catch {
            // Still failed - clear and logout
          }
        }
        clearTokens();
        setUser(null);
      } else {
        // Other error - log but keep trying
        console.error('Failed to fetch user:', error);
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Set up token refresh interval
  useEffect(() => {
    if (!user) return;

    // Refresh token every 10 minutes (access token expires in 15)
    const interval = setInterval(async () => {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        // Refresh failed - log out
        setUser(null);
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      await apiLogin(credentials);
      const userData = await getCurrentUser();
      setUser(userData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await apiLogout();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!isLoggedIn()) return;
    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch {
      // Ignore errors
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
