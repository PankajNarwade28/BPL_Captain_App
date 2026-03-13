/* eslint-disable react/prop-types */
import React from 'react';
import { CircleX, Sparkles, Trophy } from 'lucide-react';

function SoldAnimationOverlay({
  show,
  soldInfo,
  getOptimizedPlayerPhoto,
  getOptimizedTeamLogo,
  placeholderImage,
  defaultTeamLogo
}) {
  if (!show || !soldInfo) return null;

  const isMyTeam = Boolean(soldInfo?.isMyTeam);
  const hasTeam = Boolean(soldInfo?.team);

  let title = '❌ UNSOLD';
  if (isMyTeam) {
    title = '🎉 YOU WON!';
  } else if (hasTeam) {
    title = 'SOLD';
  }

  let cardColor = 'border-red-300 bg-red-50';
  if (isMyTeam) {
    cardColor = 'border-emerald-300 bg-emerald-50';
  } else if (hasTeam) {
    cardColor = 'border-indigo-300 bg-indigo-50';
  }

  let titleIcon = <CircleX className="h-5 w-5 text-red-700" />;
  if (isMyTeam) {
    titleIcon = <Sparkles className="h-5 w-5 text-emerald-700" />;
  } else if (hasTeam) {
    titleIcon = <Trophy className="h-5 w-5 text-indigo-700" />;
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/20 px-4 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-2xl border p-6 text-center shadow-xl ${cardColor}`}>
        <h1 className="mb-4 flex items-center justify-center gap-2 text-2xl font-bold text-slate-900">
          {titleIcon}
          {title}
        </h1>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <img
            src={getOptimizedPlayerPhoto(soldInfo.player.photo)}
            alt={soldInfo.player.name}
            className="mx-auto h-28 w-28 rounded-full object-cover ring-2 ring-slate-200"
            onError={(event) => {
              event.target.onerror = null;
              event.target.src = placeholderImage;
            }}
          />
          <h2 className="mt-3 text-xl font-semibold text-slate-900">{soldInfo.player.name}</h2>

          {soldInfo.team && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <img
                src={getOptimizedTeamLogo(soldInfo.team.logo)}
                alt={soldInfo.team.teamName}
                className="h-8 w-8 rounded-full object-cover"
                onError={(event) => {
                  event.target.onerror = null;
                  event.target.src = defaultTeamLogo;
                }}
              />
              <span className="text-sm font-medium text-slate-700">{soldInfo.team.teamName}</span>
            </div>
          )}

          <div className="mt-4 text-2xl font-bold text-indigo-700">
            ₹{soldInfo.amount}L
          </div>
        </div>
      </div>
    </div>
  );
}

export default SoldAnimationOverlay;
