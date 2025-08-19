'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

type AppUser = {
  id: string;
  email: string;
  displayName?: string;
};

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  masterKey: CryptoKey | null;
  setMasterKey: (key: CryptoKey | null) => void;
  setUser: (user: AppUser | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const protectedRoutes = ['/dashboard', '/settings'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Load user from localStorage if present (for admin or persisted login)
    const storedUser = localStorage.getItem('masterUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      setUser(null);
    }
    setLoading(false);

    // Redirect if not logged in and on protected route
    if (!storedUser && protectedRoutes.includes(pathname)) {
      router.push('/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, router]);

  useEffect(() => {
    if (user === null) {
      localStorage.removeItem('masterUser');
    } else {
      localStorage.setItem('masterUser', JSON.stringify(user));
    }
  }, [user]);

  const value = {
    user,
    loading,
    masterKey,
    setMasterKey,
    setUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="flex h-screen items-center justify-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-dashed border-primary"></div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}