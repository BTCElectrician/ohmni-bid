'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Camera, LogOut, Mic, Plus } from 'lucide-react';

import { AuthCard } from '@/components/AuthCard';
import { WalkthroughRoomMode } from '@/components/WalkthroughRoomMode';
import { DEFAULT_PARAMETERS } from '@/lib/estimate/defaults';
import type { EstimateParameters } from '@/lib/estimate/types';
import { useWorkspaceAuth } from '@/lib/hooks/useWorkspace';

export default function WalkthroughPage() {
  const {
    user,
    orgId,
    supabase,
    loading,
    error: authError,
    signInWithEmail,
    signOut
  } = useWorkspaceAuth();
  const [authEmail, setAuthEmail] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  const [latestEstimateId, setLatestEstimateId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'creating' | 'ready' | 'error'>(
    'idle'
  );
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [estimateParameters, setEstimateParameters] = useState<EstimateParameters>({
    ...DEFAULT_PARAMETERS
  });

  const [transcript, setTranscript] = useState('');
  const [photoResult, setPhotoResult] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const hasSession = sessionStatus === 'ready' && Boolean(sessionId);

  useEffect(() => {
    if (!user || !orgId) return;

    let active = true;
    const loadEstimate = async () => {
      const { data, error } = await supabase
        .from('estimates')
        .select('id, labor_rate, material_tax_rate, overhead_profit_rate')
        .eq('org_id', orgId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active) return;
      if (error) {
        setSessionError(error.message);
        return;
      }
      setLatestEstimateId(data?.id || null);
      if (data) {
        setEstimateParameters({
          laborRate: Number(data.labor_rate || DEFAULT_PARAMETERS.laborRate),
          materialTaxRate: Number(
            data.material_tax_rate || DEFAULT_PARAMETERS.materialTaxRate
          ),
          overheadProfitRate: Number(
            data.overhead_profit_rate || DEFAULT_PARAMETERS.overheadProfitRate
          )
        });
      }
    };

    loadEstimate();

    return () => {
      active = false;
    };
  }, [user, orgId, supabase]);

  const handleEmailSignIn = async () => {
    if (!authEmail) return;
    const ok = await signInWithEmail(authEmail);
    if (ok) {
      setAuthMessage('Check your email for the sign-in link.');
    }
  };

  const startSession = async () => {
    if (!user || !orgId) return;
    if (!latestEstimateId) {
      setSessionError('Create an estimate first to attach a walkthrough session.');
      return;
    }

    setSessionStatus('creating');
    setSessionError(null);

    const { data, error } = await supabase
      .from('walkthrough_sessions')
      .insert({
        org_id: orgId,
        estimate_id: latestEstimateId,
        created_by: user.id,
        status: 'open'
      })
      .select('id')
      .single();

    if (error || !data) {
      setSessionStatus('error');
      setSessionError(error?.message || 'Session create failed');
      return;
    }

    setSessionId(data.id);
    setSessionStatus('ready');
  };

  const handleAudioUpload = async (file: File) => {
    if (!sessionId) {
      setSessionError('Start a walkthrough session first.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('audio', file, file.name || 'note.webm');
    formData.append('session_id', sessionId);

    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData
    });

    const payload = await response.json();
    if (!response.ok) {
      setUploadError(payload?.error || 'Transcription failed');
      setUploading(false);
      return;
    }

    setTranscript(payload.transcript || '');
    setUploading(false);
  };

  const handleImageUpload = async (file: File) => {
    if (!sessionId) {
      setSessionError('Start a walkthrough session first.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('image', file, file.name || 'photo.jpg');
    formData.append('session_id', sessionId);

    const response = await fetch('/api/vision-count', {
      method: 'POST',
      body: formData
    });

    const payload = await response.json();
    if (!response.ok) {
      setUploadError(payload?.error || 'Vision count failed');
      setUploading(false);
      return;
    }

    setPhotoResult(JSON.stringify(payload, null, 2));
    setUploading(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-md px-6 py-16">
          <div className="glass-panel rounded-3xl p-10">
            <h1 className="text-xl font-semibold text-slate-100">Loading workspace</h1>
            <p className="mt-2 text-sm text-slate-300">Preparing your walkthrough.</p>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-md px-6 py-16">
          <AuthCard
            email={authEmail}
            onEmailChange={setAuthEmail}
            onSubmit={handleEmailSignIn}
            message={authMessage}
            error={authError}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -left-28 top-24 h-56 w-56 rounded-full bg-[var(--accent)]/25 blur-[120px] animate-float sm:h-80 sm:w-80 sm:blur-[140px]" />
      <div className="pointer-events-none absolute right-[-120px] top-[-90px] h-[300px] w-[300px] rounded-full bg-[var(--accent-2)]/25 blur-[140px] animate-float sm:h-96 sm:w-96 sm:blur-[160px]" />
      <div className="pointer-events-none absolute bottom-[-140px] left-1/3 h-[320px] w-[320px] rounded-full bg-[var(--accent-3)]/25 blur-[160px] animate-float sm:h-96 sm:w-96 sm:blur-[180px]" />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-6">
          <div className="glass-panel rounded-3xl p-6 animate-rise">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <span className="badge">Walkthrough</span>
                <h1 className="mt-4 text-2xl font-semibold text-slate-100">
                  Capture notes and photos for a draft takeoff.
                </h1>
                <p className="mt-2 text-sm text-slate-300">
                  Keep field data clean, then apply it when you’re back at the desk.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/estimate"
                  className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-100"
                >
                  Back to Estimate
                </Link>
                <button
                  onClick={signOut}
                  className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-100"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2 text-sm text-slate-300">
              <span>Signed in as {user.email || 'user'}</span>
              {latestEstimateId ? (
                <span className="font-mono text-xs text-slate-400">
                  Linked estimate: {latestEstimateId}
                </span>
              ) : (
                <span>
                  No estimate found. Create one in the estimate workspace first.
                </span>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={startSession}
                className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-900"
                disabled={!latestEstimateId || sessionStatus === 'creating'}
              >
                <Plus className="h-4 w-4" />
                {sessionStatus === 'creating'
                  ? 'Starting...'
                  : hasSession
                    ? 'Session Active'
                    : 'Start Walkthrough'}
              </button>
              {sessionId ? (
                <span className="pill text-xs text-slate-300">
                  Session {sessionId.slice(0, 8)}
                </span>
              ) : null}
              {sessionError ? (
                <span className="text-xs text-rose-300">{sessionError}</span>
              ) : null}
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Starting a walkthrough opens a session linked to your latest estimate. Use it
              to attach voice notes and photos.
            </p>
          </div>

          <WalkthroughRoomMode
            transcript={transcript}
            estimateParameters={estimateParameters}
          />

          <div className="grid gap-6 md:grid-cols-2 animate-rise-delayed">
            <div className="glass-panel rounded-3xl p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                <Mic className="h-4 w-4" />
                Voice note
              </div>
              <p className="mt-2 text-sm text-slate-300">
                Upload an audio note to transcribe into a draft list.
              </p>
              <input
                type="file"
                accept="audio/*"
                className={`mt-4 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100 ${!hasSession ? 'cursor-not-allowed opacity-60' : ''}`}
                disabled={!hasSession}
                onChange={event => {
                  const file = event.target.files?.[0];
                  if (file) {
                    handleAudioUpload(file);
                  }
                }}
              />
              {uploading ? (
                <p className="mt-2 text-xs text-slate-400">Processing...</p>
              ) : null}
              {transcript ? (
                <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-200">
                  {transcript}
                </pre>
              ) : null}
            </div>

            <div className="glass-panel rounded-3xl p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                <Camera className="h-4 w-4" />
                Photo counts
              </div>
              <p className="mt-2 text-sm text-slate-300">
                Upload a photo to get suggested counts for review.
              </p>
              <input
                type="file"
                accept="image/*"
                className={`mt-4 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100 ${!hasSession ? 'cursor-not-allowed opacity-60' : ''}`}
                disabled={!hasSession}
                onChange={event => {
                  const file = event.target.files?.[0];
                  if (file) {
                    handleImageUpload(file);
                  }
                }}
              />
              {uploading ? (
                <p className="mt-2 text-xs text-slate-400">Processing...</p>
              ) : null}
              {photoResult ? (
                <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-200">
                  {photoResult}
                </pre>
              ) : null}
            </div>
          </div>

          {uploadError ? (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
              {uploadError}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
