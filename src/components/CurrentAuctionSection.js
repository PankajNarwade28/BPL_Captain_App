/* eslint-disable react/prop-types */
import React from 'react';
import { AlertTriangle, CircleDollarSign, Clock3, Medal, Rocket, Target, Trophy } from 'lucide-react';

const bidButtonBase = 'flex w-full flex-col items-center justify-center rounded-xl border px-3 py-3 text-center transition disabled:cursor-not-allowed disabled:opacity-60';

function CurrentAuctionSection({
  currentPlayer,
  timerValue,
  currentBid,
  isHighestBidder,
  bidSuccess,
  hasNoBids,
  canBid,
  getNextBidAmount,
  handleBid,
  isConnected,
  error,
  teamData,
  maxSquadSize,
  getOptimizedPlayerPhoto,
  placeholderImage
}) {
  if (!currentPlayer) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
          <Clock3 className="h-7 w-7 animate-pulse" />
        </div>
        <h3 className="mt-4 text-xl font-semibold text-slate-900">Waiting for Next Player</h3>
        <p className="mt-1 text-sm text-slate-500">The admin will start the auction soon.</p>
      </div>
    );
  }

  const cannotBidAny = !canBid(0) && !canBid(10) && !canBid(20);
  const isSquadFull = teamData.players && teamData.players.length >= maxSquadSize;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Current Auction</h3>
        <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">Live</span>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-4">
          <img
            src={getOptimizedPlayerPhoto(currentPlayer.photo)}
            alt={currentPlayer.name}
            className="h-20 w-20 rounded-xl object-cover ring-2 ring-slate-200"
            onError={(event) => {
              event.target.onerror = null;
              event.target.src = placeholderImage;
            }}
          />
          <div className="min-w-0">
            <h4 className="truncate text-lg font-semibold text-slate-900">{currentPlayer.name}</h4>
            <p className="text-sm text-slate-600">{currentPlayer.category}</p>
            <p className="mt-1 text-sm font-medium text-indigo-700">Base: ₹{currentPlayer.basePrice}L</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2 flex items-center justify-between text-sm text-slate-700">
          <span className="flex items-center gap-1"><Clock3 className="h-4 w-4" /> Time Remaining</span>
          <span className={`font-semibold ${timerValue <= 5 ? 'text-red-600' : 'text-slate-900'}`}>{timerValue}s</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-300 ${timerValue <= 5 ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-cyan-500 to-indigo-500'}`}
            style={{ width: `${(timerValue / 20) * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center gap-2 text-slate-700">
          <CircleDollarSign className="h-4 w-4" />
          <span className="text-sm">Current Bid</span>
        </div>
        <p className="mt-1 text-2xl font-bold text-indigo-700">₹{currentBid.amount}L</p>
        <p className="text-sm text-slate-700">
          {isHighestBidder ? (
            <span className="inline-flex items-center gap-1 text-emerald-700"><Trophy className="h-4 w-4" /> You are winning</span>
          ) : (
            currentBid.teamName
          )}
        </p>
      </div>

      {isHighestBidder ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
          <p className="flex items-center gap-2 font-medium"><Medal className="h-4 w-4" /> You're the highest bidder</p>
          <p className="mt-1 text-emerald-700">Wait for other teams to bid or win this player.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {hasNoBids && canBid(0) && (
              <button
                className={`${bidButtonBase} border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100`}
                onClick={() => handleBid(0)}
                disabled={!isConnected}
              >
                <Target className="mb-1 h-4 w-4" />
                <span className="font-semibold">{bidSuccess ? 'Bid Placed!' : `₹${getNextBidAmount(0)}L`}</span>
                <span className="text-xs opacity-80">Base Price</span>
              </button>
            )}

            {canBid(10) && (
              <button
                className={`${bidButtonBase} border-cyan-300 bg-cyan-50 text-cyan-700 hover:bg-cyan-100`}
                onClick={() => handleBid(10)}
                disabled={!isConnected}
              >
                <CircleDollarSign className="mb-1 h-4 w-4" />
                <span className="font-semibold">{bidSuccess ? 'Bid Placed!' : `₹${getNextBidAmount(10)}L`}</span>
                <span className="text-xs opacity-80">+₹10L</span>
              </button>
            )}

            {canBid(20) && (
              <button
                className={`${bidButtonBase} border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100`}
                onClick={() => handleBid(20)}
                disabled={!isConnected}
              >
                <Rocket className="mb-1 h-4 w-4" />
                <span className="font-semibold">{bidSuccess ? 'Bid Placed!' : `₹${getNextBidAmount(20)}L`}</span>
                <span className="text-xs opacity-80">+₹20L</span>
              </button>
            )}
          </div>

          {cannotBidAny && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700">
              <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" /> {isSquadFull ? 'Squad Full!' : 'Insufficient Points'}</p>
              <p className="mt-1 text-amber-700">
                {isSquadFull
                  ? `Maximum ${maxSquadSize} players reached. Cannot bid further.`
                  : `You only have ₹${teamData.remainingPoints}L remaining.`}
              </p>
            </div>
          )}
        </>
      )}

      {error && <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
    </div>
  );
}

export default CurrentAuctionSection;
