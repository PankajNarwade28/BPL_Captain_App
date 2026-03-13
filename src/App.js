import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import LoadingAnimation from './LoadingAnimation';
import LoginView from './components/LoginView';
import SoldAnimationOverlay from './components/SoldAnimationOverlay';
import TeamHeader from './components/TeamHeader';
import BudgetProgress from './components/BudgetProgress';
import CurrentAuctionSection from './components/CurrentAuctionSection';
import PlayersSection from './components/PlayersSection';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL;
const API_URL = process.env.REACT_APP_API_URL;
const MAX_SQUAD_SIZE = Number.parseInt(process.env.REACT_APP_MAX_SQUAD_SIZE, 10) || 11;

// Ensure URLs end with a slash for proper path construction
const normalizeUrl = (url) => url && (url.endsWith('/') ? url : url + '/');
const BASE_URL = normalizeUrl(SOCKET_URL);

const PLACEHOLDER_IMAGE = 'https://res.cloudinary.com/dz8q0fb8m/image/upload/v1772197979/defaultPlayer_kad3xb.png';
const DEFAULT_TEAM_LOGO = 'https://res.cloudinary.com/dz8q0fb8m/image/upload/v1772197980/defaultTeam_x7thxe.png';

const buildImgUrl = (path, base, placeholder) => {
  if (!path || path.trim() === '') return placeholder;

  // If it's a Cloudinary URL, return as-is
  if (path.startsWith('http')) return path;

  // Normalize base URL to ensure it has protocol and trailing slash
  let normalizedBase = base;
  if (!normalizedBase.startsWith('http')) {
    normalizedBase = 'http://localhost:5000/';
  }
  normalizedBase = normalizedBase.endsWith('/')
    ? normalizedBase
    : normalizedBase + '/';

  // Clean the path - remove leading slashes
  const cleanPath = path.replace(/^\/+/, '');

  // Construct the full URL
  return `${normalizedBase}${cleanPath}`;
};

// Helper function to get optimized player photo
const getOptimizedPlayerPhoto = (photoUrl) => {
  if (!photoUrl) return PLACEHOLDER_IMAGE;
  if (photoUrl.startsWith('http')) return photoUrl;
  return buildImgUrl(photoUrl, BASE_URL, PLACEHOLDER_IMAGE);
};

// Helper function to get optimized team logo
const getOptimizedTeamLogo = (logoUrl) => {
  if (!logoUrl) return DEFAULT_TEAM_LOGO;
  if (logoUrl.startsWith('http')) return logoUrl;
  return buildImgUrl(logoUrl, BASE_URL, DEFAULT_TEAM_LOGO);
};

function App() {
  const [socket, setSocket] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [teamId, setTeamId] = useState('');
  const [pin, setPin] = useState('');
  const [teamData, setTeamData] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [currentBid, setCurrentBid] = useState({ amount: 5, teamName: '' });
  const [timerValue, setTimerValue] = useState(20);
  const [error, setError] = useState('');
  const [bidSuccess, setBidSuccess] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  const [allPlayers, setAllPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // all, sold, unsold, remaining
  const [showSoldAnimation, setShowSoldAnimation] = useState(false);
  const [soldInfo, setSoldInfo] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const soldAnimationTimeout = useRef(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    });
    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('🔌 Captain app connected to server');
      console.log('Socket ID:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Captain app disconnected from server');
    });

    newSocket.on('reconnect', () => {
      console.log('Captain app reconnected to server');
    });

    // ========================================
    // SET UP ALL LISTENERS FIRST (before auto-login)
    // ========================================

    // Auth events
    newSocket.on('auth:success', (data) => {
      console.log('🔓 auth:success event received');
      console.log('Team data:', data.team);
      if (data.team) {
        console.log('✅ Auth successful, team:', data.team.teamName);
        setIsAuthenticated(true);
        setTeamData(data.team);
        setError('');
        setIsLoading(false);
        setIsInitializing(false);
        console.log('⏳ Waiting for auction:state event after successful auth...');
      }
    });

    newSocket.on('auth:error', (data) => {
      setError(data.message);
      setIsLoading(false);
      setIsInitializing(false);
      // Clear invalid credentials
      localStorage.removeItem('captain_teamId');
      localStorage.removeItem('captain_pin');
    });

    // Auction events
    // Listen for current auction state (same logic as big-screen for robustness)
    newSocket.on('auction:state', (data) => {
      console.log('📡 Captain app received auction:state event');
      console.log('📦 Full data:', JSON.stringify(data, null, 2));
      
      if (!data) {
        console.log('⚠️ auction:state data is null/undefined');
        return;
      }
      
      if (!data.state) {
        console.log('⚠️ No state property in auction:state data');
        console.log('Data keys:', Object.keys(data));
        return;
      }
      
      console.log('Auction state properties:', {
        isActive: data.state.isActive,
        isPaused: data.state.isPaused,
        hasCurrentPlayer: !!data.state.currentPlayer,
        currentPlayerName: data.state.currentPlayer?.name,
        timerValue: data.timerValue
      });
      
      // If there's a current player, show it (same as big-screen)
      if (data.state.currentPlayer) {
        console.log('✅ Setting current player from auction:state:', data.state.currentPlayer.name);
        setCurrentPlayer(data.state.currentPlayer);
        setCurrentBid({
          amount: data.state.currentHighBid?.amount || data.state.currentPlayer.basePrice,
          teamName: data.state.currentHighBid?.team?.teamName || 'No Bids Yet'
        });
        setTimerValue(data.timerValue || 20);
        console.log('✅ Current player state updated successfully');
      } else {
        console.log('❌ No current player in auction state (state.currentPlayer is null/undefined)');
        setCurrentPlayer(null);
        setTimerValue(0);
      }
    });

    newSocket.on('auction:started', (data) => {
      console.log('Auction started:', data);
      setCurrentPlayer(data.player);
      setCurrentBid({ amount: data.basePrice, teamName: 'Base Price' });
      setTimerValue(data.timerValue);
      setBidSuccess(false);
    });

    newSocket.on('bid:new', (data) => {
      setCurrentBid({
        amount: data.amount,
        teamName: data.teamName
      });
      // Check if this is our bid and update team data immediately
      if (teamData && data.teamId && teamData.id && data.teamId.toString() === teamData.id.toString()) {
        setBidSuccess(true);
        setTimeout(() => setBidSuccess(false), 2000);
        
        // Update remaining purse immediately
        if (data.team?.remainingPoints !== undefined) {
          setTeamData(prev => ({
            ...prev,
            remainingPoints: data.team.remainingPoints,
            purseBudget: data.team.purseBudget
          }));
        }
      }
    });

    newSocket.on('timer:update', (data) => {
      setTimerValue(data.value);
    });

    newSocket.on('timer:reset', (data) => {
      setTimerValue(data.value);
    });

    newSocket.on('player:sold', (data) => {
      console.log('🎯 Player sold event:', data);
      
      // Clear any existing sold animation
      if (soldAnimationTimeout.current) {
        clearTimeout(soldAnimationTimeout.current);
      }
      
      // Show sold animation
      setSoldInfo({
        player: data.player,
        team: data.team,
        amount: data.amount,
        isMyTeam: teamData?.id && data.team?.id && data.team.id.toString() === teamData.id.toString()
      });
      setShowSoldAnimation(true);
      
      // Hide animation after 5 seconds
      const timeout = setTimeout(() => {
        setShowSoldAnimation(false);
        setSoldInfo(null);
        soldAnimationTimeout.current = null;
      }, 5000);
      soldAnimationTimeout.current = timeout;
      
      // Update team data if this team won the player
      setTeamData(prev => {
        if (prev && data.team?.id && 
            data.team.id.toString() === prev.id.toString()) {
          return {
            ...prev,
            remainingPoints: prev.remainingPoints - data.amount,
            rosterSlotsFilled: prev.rosterSlotsFilled + 1,
            players: [...prev.players, data.player]
          };
        }
        return prev;
      });
      
      setCurrentPlayer(null);
      
      // Refresh all players list if it's being viewed
      if (showAllPlayers) {
        fetchAllPlayers();
      }
    });

    newSocket.on('auction:reset', (data) => {
      console.log('Auction reset:', data.message);
      // Reset auction state
      setCurrentPlayer(null);
      setTimerValue(0);
      setCurrentBid({ amount: 5, teamName: '' });
      
      // Refresh all players list to show player back as UNSOLD
      if (showAllPlayers) {
        fetchAllPlayers();
      }
    });

    // Listen for auction ended event
    newSocket.on('auction:ended', (data) => {
      console.log('Auction ended:', data);
      setCurrentPlayer(null);
      setTimerValue(0);
    });

    newSocket.on('bid:error', (data) => {
      setError(data.message);
      setTimeout(() => setError(''), 3000);
    });

    newSocket.on('bid:success', () => {
      setBidSuccess(true);
      setTimeout(() => setBidSuccess(false), 2000);
    });

    // ========================================
    // AUTO-LOGIN (after all listeners are set up)
    // ========================================
    console.log('✅ All socket listeners registered');
    
    // Check for saved credentials and auto-login
    const savedTeamId = localStorage.getItem('captain_teamId');
    const savedPin = localStorage.getItem('captain_pin');
    
    if (savedTeamId && savedPin) {
      setTeamId(savedTeamId);
      setPin(savedPin);
      console.log('🔐 Auto-login with saved credentials for team:', savedTeamId);
      // Use setTimeout to ensure listeners are fully registered
      setTimeout(() => {
        console.log('📤 Emitting team:login event');
        newSocket.emit('team:login', { teamId: savedTeamId, pin: savedPin });
      }, 100);
      
      // Set timeout to stop initializing if auth takes too long (fallback)
      setTimeout(() => {
        console.log('⏱️ Auto-login timeout check');
        setIsInitializing(false);
      }, 3000);
    } else {
      console.log('ℹ️ No saved credentials found, waiting for manual login');
      // No saved credentials, stop initializing and show login
      setTimeout(() => setIsInitializing(false), 500);
    }

    return () => {
      if (soldAnimationTimeout.current) {
        clearTimeout(soldAnimationTimeout.current);
      }
      newSocket.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - socket should only be created once

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);
    if (socket) {
      socket.emit('team:login', { teamId, pin });
      // Save credentials on successful manual login
      socket.once('auth:success', () => {
        localStorage.setItem('captain_teamId', teamId);
        localStorage.setItem('captain_pin', pin);
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('captain_teamId');
    localStorage.removeItem('captain_pin');
    setIsAuthenticated(false);
    setTeamData(null);
    setCurrentPlayer(null);
  };

  const handleBid = (increment = 10) => {
    if (!socket || !teamData || !currentPlayer) return;

    // Check if team has reached max squad size
    const currentRosterSize = teamData.players ? teamData.players.length : 0;
    if (currentRosterSize >= MAX_SQUAD_SIZE) {
      setError(`Squad full! Maximum ${MAX_SQUAD_SIZE} players allowed`);
      setTimeout(() => setError(''), 3000);
      return;
    }

    const nextBid = currentBid.amount + increment;

    if (nextBid > teamData.remainingPoints) {
      setError(`Insufficient points. You only have ₹${teamData.remainingPoints}L remaining`);
      setTimeout(() => setError(''), 3000);
      return;
    }

    socket.emit('bid:place', { amount: nextBid });
  };

  const fetchAllPlayers = async () => {
    setLoadingPlayers(true);
    try {
      const url = `${API_URL}/players`;
      console.log('Fetching players from:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('Players API response:', data);
      
      if (data.success) {
        console.log('Total players loaded:', data.players.length);
        setAllPlayers(data.players);
      } else {
        console.error('API returned success: false', data);
        setError(data.message || 'Failed to load players');
        setTimeout(() => setError(''), 3000);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
      setError('Failed to load players');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const handleViewAllPlayers = () => {
    if (!showAllPlayers) {
      fetchAllPlayers();
    }
    setShowAllPlayers(!showAllPlayers);
  };

  const hasNoBids = currentBid.teamName === 'Base Price' || !currentBid.teamName || currentBid.teamName === 'No Bids Yet';

  const getNextBidAmount = (increment = 10) => {
    // If no bids yet and increment is 0, return base price
    if (increment === 0 && hasNoBids) {
      return currentBid.amount;
    }
    return currentBid.amount + increment;
  };

  const canBid = (increment = 10) => {
    if (!teamData || !currentPlayer) return false;
    
    // Check if squad is full
    const currentRosterSize = teamData.players ? teamData.players.length : 0;
    if (currentRosterSize >= MAX_SQUAD_SIZE) return false;
    
    const nextBid = getNextBidAmount(increment);
    return nextBid <= teamData.remainingPoints;
  };

  const isHighestBidder = currentBid.teamName === teamData?.teamName;

  if (isInitializing) {
    return <LoadingAnimation message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return (
      <LoginView
        isLoading={isLoading}
        isConnected={isConnected}
        teamId={teamId}
        pin={pin}
        error={error}
        onTeamIdChange={setTeamId}
        onPinChange={setPin}
        onSubmit={handleLogin}
      />
    );
  }

  if (!teamData) {
    return (
      <div className="min-h-screen bg-slate-50">
        <LoadingAnimation message="Loading team data..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SoldAnimationOverlay
        show={showSoldAnimation}
        soldInfo={soldInfo}
        getOptimizedPlayerPhoto={getOptimizedPlayerPhoto}
        getOptimizedTeamLogo={getOptimizedTeamLogo}
        placeholderImage={PLACEHOLDER_IMAGE}
        defaultTeamLogo={DEFAULT_TEAM_LOGO}
      />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
        {!isConnected && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
            ⚠️ Connection lost. Reconnecting...
          </div>
        )}

        <TeamHeader
          teamData={teamData}
          onLogout={handleLogout}
          getOptimizedTeamLogo={getOptimizedTeamLogo}
          defaultTeamLogo={DEFAULT_TEAM_LOGO}
        />

        <BudgetProgress teamData={teamData} maxSquadSize={MAX_SQUAD_SIZE} />

        <CurrentAuctionSection
          currentPlayer={currentPlayer}
          timerValue={timerValue}
          currentBid={currentBid}
          isHighestBidder={isHighestBidder}
          bidSuccess={bidSuccess}
          hasNoBids={hasNoBids}
          canBid={canBid}
          getNextBidAmount={getNextBidAmount}
          handleBid={handleBid}
          isConnected={isConnected}
          error={error}
          teamData={teamData}
          maxSquadSize={MAX_SQUAD_SIZE}
          getOptimizedPlayerPhoto={getOptimizedPlayerPhoto}
          placeholderImage={PLACEHOLDER_IMAGE}
        />

        <PlayersSection
          showAllPlayers={showAllPlayers}
          setShowAllPlayers={setShowAllPlayers}
          handleViewAllPlayers={handleViewAllPlayers}
          loadingPlayers={loadingPlayers}
          allPlayers={allPlayers}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          teamData={teamData}
          apiUrl={API_URL}
          getOptimizedPlayerPhoto={getOptimizedPlayerPhoto}
          placeholderImage={PLACEHOLDER_IMAGE}
        />
      </div>
    </div>
  );
}

export default App;

