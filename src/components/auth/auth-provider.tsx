'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, fetchProfile } = useAuthStore();

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        useAuthStore.getState().setLoading(false);
      }
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'INITIAL_SESSION') return; // Handled by getSession()

        if (session) {
          setUser(session.user);
          fetchProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          useAuthStore.getState().setProfile(null);
          useAuthStore.getState().setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setUser, fetchProfile]);

  return <>{children}</>;
}
