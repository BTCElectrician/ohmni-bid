'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { getBrowserSupabase, hasSupabaseEnv } from '@/lib/db/supabase';
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
  const [devBypassAttempted, setDevBypassAttempted] = useState(false);

  useEffect(() => {
    if (!hasSupabaseEnv) {
      setError('Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      setAuthReady(true);
      return;
    }

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

  const sessionUser = session?.user ?? null;

  useEffect(() => {
    if (!authReady || !hasSupabaseEnv) return;
    if (!sessionUser) {
      setOrgId(null);
      return;
    }

    let active = true;
    setOrgLoading(true);
    getOrCreateOrgId(supabase, sessionUser)
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
  }, [authReady, sessionUser, supabase]);

  const attemptDevBypass = useCallback(
    async (email: string) => {
      if (process.env.NODE_ENV !== 'development' || devBypassAttempted) {
        return false;
      }

      setDevBypassAttempted(true);

      const response = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || 'Dev login failed.');
        return false;
      }

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError) {
        setError(sessionError.message);
        return false;
      }
      if (!sessionData.session) {
        setError('Dev login did not return a session.');
        return false;
      }

      setSession(sessionData.session);
      setError(null);
      return true;
    },
    [devBypassAttempted, supabase]
  );

  const signInWithEmail = useCallback(
    async (email: string) => {
      if (!hasSupabaseEnv) {
        setError('Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
        return false;
      }
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
        const message = signInError.message.toLowerCase();
        if (message.includes('rate limit')) {
          const bypassed = await attemptDevBypass(email);
          if (bypassed) {
            return true;
          }
        }
        setError(signInError.message);
        return false;
      }
      return true;
    },
    [attemptDevBypass, supabase]
  );

  const signOut = useCallback(async () => {
    if (!hasSupabaseEnv) {
      setError('Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      return;
    }
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
