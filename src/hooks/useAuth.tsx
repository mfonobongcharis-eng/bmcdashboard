// BMC Command Center - useAuth Hook
// Authentication state management and login/logout logic

import { useState, useEffect, useCallback, useContext, createContext } from 'react';
import type { User } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  error: string | null;
  clearError: () => void;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is logged in on mount
  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error('Failed to check user:', err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();

    // Subscribe to auth state changes
    const { data: { subscription } } = authService.onAuthStateChange((updatedUser) => {
      setUser(updatedUser);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await authService.signIn({ email, password });
      setUser(user);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to sign in';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(
    async (email: string, password: string, fullName: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const user = await authService.signUp({
          email,
          password,
          full_name: fullName,
          role: 'internal',
        });
        setUser(user);
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to sign up';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.signOut();
      setUser(null);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to sign out';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setError(null);
    try {
      await authService.resetPassword(email);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to reset password';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    login,
    signup,
    logout,
    resetPassword,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
