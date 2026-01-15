'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { getBrowserSupabase } from '@/lib/db/supabase';
import { getOrCreateOrgId } from '@/lib/org';

interface WorkspaceAuthState {
  user: User | null;
  orgId: string | null;
  loading: boolean;
  error: string | null;
  signInWithEmail: (email: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  supabase: ReturnType<typeof getBrowserSupabase>;
}

export function useWorkspaceAuth(): WorkspaceAuthState {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [orgLoading, setOrgLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) {
          setError(sessionError.message);
        }
        setSession(data.session ?? null);
        setAuthReady(true);
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setError(null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!authReady) return;
    if (!session?.user) {
      setOrgId(null);
      return;
    }

    let active = true;
    setOrgLoading(true);
    getOrCreateOrgId(supabase, session.user)
      .then(id => {
        if (!active) return;
        setOrgId(id);
      })
      .catch(err => {
        if (!active) return;
        setError(err.message || 'Workspace setup failed');
      })
      .finally(() => {
        if (!active) return;
        setOrgLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authReady, session?.user?.id, supabase]);

  const signInWithEmail = useCallback(
    async (email: string) => {
      setError(null);
      const redirectTo =
        typeof window === 'undefined'
          ? undefined
          : `${window.location.origin}/estimate`;
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined
      });
      if (signInError) {
        setError(signInError.message);
        return false;
      }
      return true;
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
    }
  }, [supabase]);

  return {
    user: session?.user ?? null,
    orgId,
    loading: !authReady || orgLoading,
    error,
    signInWithEmail,
    signOut,
    supabase
  };
}
