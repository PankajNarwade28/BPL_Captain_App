/* eslint-disable react/prop-types */
import React from 'react';
import { CheckCircle2, Download, Filter, ListChecks, Loader2, Users, UserRound } from 'lucide-react';

const FILTER_KEYS = {
  all: 'all',
  sold: 'sold',
  unsold: 'unsold',
  remaining: 'remaining'
};

const filterPlayersByStatus = (players, filterStatus) => {
  if (filterStatus === FILTER_KEYS.sold) return players.filter((player) => player.status === 'SOLD');
  if (filterStatus === FILTER_KEYS.unsold) return players.filter((player) => player.status === 'UNSOLD');
  if (filterStatus === FILTER_KEYS.remaining) return players.filter((player) => player.status === 'IN_AUCTION');
  return players;
};

const tabBtn = (active) => `inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`;

function PlayersSection({
  showAllPlayers,
  setShowAllPlayers,
  handleViewAllPlayers,
  loadingPlayers,
  allPlayers,
  filterStatus,
  setFilterStatus,
  teamData,
  apiUrl,
  getOptimizedPlayerPhoto,
  placeholderImage
}) {
  const availablePlayers = allPlayers.filter((player) => player.availability !== 'UNAVAILABLE');
  const soldPlayers = availablePlayers.filter((player) => player.status === 'SOLD');
  const unsoldPlayers = availablePlayers.filter((player) => player.status === 'UNSOLD');
  const inAuctionPlayers = availablePlayers.filter((player) => player.status === 'IN_AUCTION');
  const filteredPlayers = filterPlayersByStatus(availablePlayers, filterStatus);
  const teamPlayers = teamData.players || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <button className={tabBtn(!showAllPlayers)} onClick={() => setShowAllPlayers(false)}>
          <Users className="h-4 w-4" /> My Squad
        </button>
        <button className={tabBtn(showAllPlayers)} onClick={handleViewAllPlayers}>
          <ListChecks className="h-4 w-4" /> All Players
        </button>
      </div>

      {showAllPlayers ? (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {!loadingPlayers && availablePlayers.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center"><p className="text-xl font-bold text-slate-900">{availablePlayers.length}</p><p className="text-xs text-slate-500">Total</p></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center"><p className="text-xl font-bold text-emerald-700">{soldPlayers.length}</p><p className="text-xs text-slate-500">Sold</p></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center"><p className="text-xl font-bold text-cyan-700">{unsoldPlayers.length}</p><p className="text-xs text-slate-500">Available</p></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center"><p className="text-xl font-bold text-amber-700">{inAuctionPlayers.length}</p><p className="text-xs text-slate-500">In Auction</p></div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {[
              { key: FILTER_KEYS.all, label: `All (${availablePlayers.length})` },
              { key: FILTER_KEYS.sold, label: `Sold (${soldPlayers.length})` },
              { key: FILTER_KEYS.unsold, label: `Available (${unsoldPlayers.length})` },
              { key: FILTER_KEYS.remaining, label: `In Auction (${inAuctionPlayers.length})` }
            ].map((option) => (
              <button
                key={option.key}
                className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium transition ${filterStatus === option.key ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}
                onClick={() => setFilterStatus(option.key)}
              >
                <Filter className="h-3.5 w-3.5" />
                {option.label}
              </button>
            ))}
          </div>

          {loadingPlayers && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading players...
            </div>
          )}

          {!loadingPlayers && availablePlayers.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-700">
              <p className="text-base font-medium">No Players Found</p>
              <p className="mt-1 text-sm text-slate-500">Players will appear here once added by admin.</p>
            </div>
          )}

          {!loadingPlayers && availablePlayers.length > 0 && (
            <div className="space-y-2">
              {filteredPlayers.map((player) => (
                <div key={player._id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <img
                      src={getOptimizedPlayerPhoto(player.photo)}
                      alt={player.name}
                      className="h-12 w-12 rounded-lg object-cover"
                      onError={(event) => {
                        event.target.onerror = null;
                        event.target.src = placeholderImage;
                      }}
                    />
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-semibold text-slate-900">{player.name}</h4>
                      <p className="text-xs text-slate-500">{player.category}</p>
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    {player.status === 'SOLD' && (
                      <>
                        <p className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Sold</p>
                        <p className="mt-1 font-semibold text-slate-800">₹{player.soldPrice}L</p>
                        {player.soldTo && <p className="text-slate-500">{player.soldTo.teamName || player.soldTo}</p>}
                      </>
                    )}

                    {player.status === 'UNSOLD' && <p className="font-medium text-cyan-700">Base ₹{player.basePrice}L</p>}
                    {player.status === 'IN_AUCTION' && <p className="font-medium text-amber-700">In Auction</p>}
                  </div>
                </div>
              ))}

              {filteredPlayers.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
                  No players found in this category.
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        teamPlayers.length > 0 && (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">My Squad</h3>
                <p className="text-xs text-slate-500">{teamPlayers.length} player{teamPlayers.length === 1 ? '' : 's'}</p>
              </div>
              <a
                href={`${apiUrl}/teams/${teamData.id}/download`}
                download
                className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            </div>

            <div className="space-y-2">
              {teamPlayers.map((player) => (
                <div key={player._id || player.name} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <img
                      src={getOptimizedPlayerPhoto(player.photo)}
                      alt={player.name}
                      className="h-12 w-12 rounded-lg object-cover"
                      onError={(event) => {
                        event.target.onerror = null;
                        event.target.src = placeholderImage;
                      }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{player.name}</p>
                      <p className="text-xs text-slate-500">{player.category}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-indigo-700">₹{player.soldPrice}L</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-slate-500">Total Spent</p>
                <p className="mt-1 font-semibold text-slate-900">₹{teamPlayers.reduce((sum, player) => sum + player.soldPrice, 0)}L</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-slate-500">Avg Price</p>
                <p className="mt-1 font-semibold text-slate-900">₹{Math.round(teamPlayers.reduce((sum, player) => sum + player.soldPrice, 0) / teamPlayers.length)}L</p>
              </div>
            </div>
          </div>
        )
      )}

      {!showAllPlayers && teamPlayers.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600 shadow-sm">
          <UserRound className="mx-auto mb-2 h-8 w-8 text-slate-400" />
          No players in your squad yet.
        </div>
      )}
    </div>
  );
}

export default PlayersSection;
