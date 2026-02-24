import { createContext, useContext, useEffect, useState } from 'react';
import authService from '@/services/authService';
import { UserContext, AuthContextType } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const response = await authService.testAuthentication();
        const userContext = authService.parseUserContext(response);
        setUser(userContext);
        sessionStorage.setItem('user', JSON.stringify(userContext));
      } catch (err) {
        console.log('[AuthContext] User not authenticated');
        setUser(null);
        setError(null); // Not an error if not logged in
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const signIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authService.testAuthentication();
      const userContext = authService.parseUserContext(response);
      setUser(userContext);
      sessionStorage.setItem('user', JSON.stringify(userContext));
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await authService.signOut();
      setUser(null);
      sessionStorage.removeItem('user');
    } catch (err: any) {
      setError(err.message || 'Sign out failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, error, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
