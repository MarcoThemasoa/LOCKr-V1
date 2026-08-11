'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { LoadingScreen } from '@/components/loading-screen';

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
    let isMounted = true;

    // Restore the REAL Supabase session (persisted in localStorage by
    // supabase-js). This is the source of truth — it keeps users logged in
    // across page reloads and clears stale state when the session expires.
    async function restoreSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email ?? '',
          });
        } else {
          // No valid session — clear any stale local user so the app does not
          // think it is logged in while API calls would fail with 401.
          localStorage.removeItem('masterUser');
          setUser(null);
        }
      } catch {
        if (isMounted) {
          localStorage.removeItem('masterUser');
          setUser(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    restoreSession();

    // Keep the user in sync with auth events (sign-in, sign-out, token refresh).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email ?? '',
          });
        }
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('masterUser');
        setUser(null);
        setMasterKey(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect if not logged in and on a protected route.
  useEffect(() => {
    if (!loading && !user && protectedRoutes.includes(pathname)) {
      router.push('/');
    }
  }, [loading, user, pathname, router]);

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
        <LoadingScreen label="Restoring session…" />
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