/* eslint-disable react/prop-types */
import React from 'react';
import { KeyRound, Loader2, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import LoadingAnimation from '../LoadingAnimation';

function LoginView({
  isLoading,
  isConnected,
  teamId,
  pin,
  error,
  onTeamIdChange,
  onPinChange,
  onSubmit
}) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      {isLoading && <LoadingAnimation message="Logging in..." />}

      <div className="mx-auto flex min-h-[80vh] w-full max-w-md items-center">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Captain Login</h1>
            <p className="mt-1 text-sm text-slate-500">Secure access to live auction controls</p>
          </div>

          {!isConnected && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              <WifiOff className="h-4 w-4" />
              Connecting to server...
            </div>
          )}

          {isConnected && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <Wifi className="h-4 w-4" />
              Connected
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="teamId" className="mb-1 block text-sm font-medium text-slate-700">Team ID</label>
              <input
                id="teamId"
                type="text"
                value={teamId}
                onChange={(event) => onTeamIdChange(event.target.value.toUpperCase())}
                placeholder="e.g., TEAM01"
                required
                disabled={isLoading}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            <div>
              <label htmlFor="pin" className="mb-1 block text-sm font-medium text-slate-700">PIN</label>
              <input
                id="pin"
                type="password"
                value={pin}
                onChange={(event) => onPinChange(event.target.value)}
                placeholder="Enter 4-digit PIN"
                maxLength="4"
                pattern="[0-9]{4}"
                required
                disabled={isLoading}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            {error && <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isLoading || !isConnected}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Login
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginView;
