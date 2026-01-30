'use client';

interface AuthCardProps {
  email: string;
  onEmailChange: (value: string) => void;
  onSubmit: () => void;
  message?: string;
  error?: string | null;
}

export function AuthCard({
  email,
  onEmailChange,
  onSubmit,
  message,
  error
}: AuthCardProps) {
  return (
    <div className="glass-panel rounded-3xl p-10">
      <h1 className="text-2xl font-semibold text-slate-100">Sign in</h1>
      <p className="mt-2 text-sm text-slate-300">
        Use an email link to access your estimate workspace.
      </p>
      <div className="mt-6 space-y-4">
        <input
          type="email"
          value={email}
          onChange={event => onEmailChange(event.target.value)}
          placeholder="you@company.com"
          className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
        />
        <button
          onClick={onSubmit}
          className="btn-primary w-full px-4 py-2 text-sm font-semibold text-slate-900"
        >
          Send sign-in link
        </button>
        {message ? <p className="text-xs text-slate-300">{message}</p> : null}
        {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      </div>
    </div>
  );
}
