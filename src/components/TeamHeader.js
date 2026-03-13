/* eslint-disable react/prop-types */
import React from 'react';
import { LogOut, ShieldUser } from 'lucide-react';

function TeamHeader({ teamData, onLogout, getOptimizedTeamLogo, defaultTeamLogo }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          <img
            src={getOptimizedTeamLogo(teamData.logo)}
            alt={teamData.teamName}
            className="h-full w-full object-cover"
            onError={(event) => {
              event.target.onerror = null;
              event.target.src = defaultTeamLogo;
            }}
          />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-slate-900">{teamData.teamName}</h2>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-600">
            <ShieldUser className="h-4 w-4 text-indigo-600" />
            {teamData.captainName}
          </p>
        </div>
      </div>

      <button
        onClick={onLogout}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </div>
  );
}

export default TeamHeader;
