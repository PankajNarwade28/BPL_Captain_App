import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import LoadingAnimation from './LoadingAnimation';
import './App.css';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL;
const API_URL = process.env.REACT_APP_API_URL;
const MAX_SQUAD_SIZE = parseInt(process.env.REACT_APP_MAX_SQUAD_SIZE) || 11;

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
        if (data.team && data.team.remainingPoints !== undefined) {
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
        isMyTeam: teamData && data.team && data.team.id && data.team.id.toString() === teamData.id.toString()
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
        if (prev && data.team && data.team.id && 
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

  // Show loading animation while initializing
  if (isInitializing) {
    return <LoadingAnimation message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return (
      <div className="app">
        {/* Loading Animation */}
        {isLoading && <LoadingAnimation message="Logging in..." />}
        
        <div className="login-container">
          <div className="login-card">
            <h1 className="app-title">🏏 Cricket Auction</h1>
            <h2>Captain Login</h2>
            
            {!isConnected && (
              <div className="connection-status connecting">
                <span className="status-dot"></span>
                Connecting to server...
              </div>
            )}
            {isConnected && (
              <div className="connection-status connected">
                <span className="status-dot"></span>
                Connected
              </div>
            )}
            
            <form onSubmit={handleLogin} className="login-form">
              <div className="form-group">
                <label htmlFor="teamId">Team ID</label>
                <input
                  id="teamId"
                  type="text"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value.toUpperCase())}
                  placeholder="e.g., TEAM01"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="pin">PIN</label>
                <input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter 4-digit PIN"
                  maxLength="4"
                  pattern="[0-9]{4}"
                  required
                  disabled={isLoading}
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <button type="submit" className="login-button" disabled={isLoading || !isConnected}>
                {isLoading ? (
                  <>
                    <span className="spinner"></span>
                    Logging in...
                  </>
                ) : (
                  'Login'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Show loading if authenticated but teamData not loaded yet
  if (!teamData) {
    return (
      <div className="app">
        <LoadingAnimation message="Loading team data..." />
      </div>
    );
  }

  return (
    <div className="app">
      {/* Sold/Unsold Animation Overlay */}
      {showSoldAnimation && soldInfo && (
        <div className={`sold-animation-overlay ${soldInfo.isMyTeam ? 'my-team' : soldInfo.team ? 'other-team' : 'unsold'}`}>
          <div className="sold-animation-content">
            <h1 className="sold-animation-title">
              {soldInfo.isMyTeam ? '🎉 YOU WON!' : soldInfo.team ? 'SOLD' : '❌ UNSOLD'}
            </h1>
            
            <div className="sold-player-card">
              <img 
                src={getOptimizedPlayerPhoto(soldInfo.player.photo)}
                alt={soldInfo.player.name}
                className="sold-player-photo"
                onError={(e) => { 
                  e.target.onerror = null;
                  e.target.src = PLACEHOLDER_IMAGE; 
                }}
              />
              <h2 className="sold-player-name">{soldInfo.player.name}</h2>
              
              {soldInfo.team && (
                <div className="sold-team-info">
                  <img 
                    src={getOptimizedTeamLogo(soldInfo.team.logo)}
                    alt={soldInfo.team.teamName}
                    className="sold-team-logo"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = DEFAULT_TEAM_LOGO;
                    }}
                  />
                  <span className="sold-team-name">{soldInfo.team.teamName}</span>
                </div>
              )}
              
              <div className="sold-amount">
                <span className="sold-animation-price">₹{soldInfo.amount}L</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="captain-dashboard">
        {/* Connection Status Badge */}
        {!isConnected && (
          <div className="connection-warning">
            ⚠️ Connection lost. Reconnecting...
          </div>
        )}

        {/* Header */}
        <div className="dashboard-header">
          <div className="team-info">
            <div className="team-badge">
              <img 
                src={getOptimizedTeamLogo(teamData.logo)}
                alt={teamData.teamName}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '12px'
                }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = DEFAULT_TEAM_LOGO;
                }}
              />
            </div>
            <div>
              <h2>{teamData.teamName}</h2>
              <p className="captain-name">👤 {teamData.captainName}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-button">
            <span>🚪</span> Logout
          </button>
        </div>

        {/* Budget Panel */}
        <div className="budget-panel">
          <div className="budget-item">
            <div className="budget-icon">💰</div>
            <div className="budget-details">
              <span className="budget-label">Remaining</span>
              <span className="budget-value">₹{teamData.remainingPoints}L</span>
            </div>
          </div>
          <div className={`budget-item ${teamData.rosterSlotsFilled >= MAX_SQUAD_SIZE ? 'squad-full' : ''}`}>
            <div className="budget-icon">{teamData.rosterSlotsFilled >= MAX_SQUAD_SIZE ? '🔒' : '👥'}</div>
            <div className="budget-details">
              <span className="budget-label">{teamData.rosterSlotsFilled >= MAX_SQUAD_SIZE ? 'Squad Full!' : 'Squad'}</span>
              <span className="budget-value">{teamData.rosterSlotsFilled}/{MAX_SQUAD_SIZE}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-header">
            <span className="progress-label">🏏 Squad Progress</span>
            <span className="progress-percentage">{Math.round((teamData.rosterSlotsFilled / MAX_SQUAD_SIZE) * 100)}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className={`progress-fill ${teamData.rosterSlotsFilled >= MAX_SQUAD_SIZE ? 'progress-complete' : ''}`}
              style={{ width: `${(teamData.rosterSlotsFilled / MAX_SQUAD_SIZE) * 100}%` }}
            >
              <span className="progress-shine"></span>
            </div>
          </div>
          <div className="progress-stats">
            <span>{teamData.rosterSlotsFilled} players</span>
            <span>{11 - teamData.rosterSlotsFilled} remaining</span>
          </div>
        </div>

        {/* Current Player */}
        {currentPlayer ? (
          <div className="current-player-section">
            <div className="section-header">
              <h3>⚡ Current Auction</h3>
            </div>
            <div className="player-card-mobile">
              <div className="player-photo-wrapper">
                <img 
                  src={getOptimizedPlayerPhoto(currentPlayer.photo)}
                  alt={currentPlayer.name}
                  className="player-photo-mobile"
                  onError={(e) => { 
                    e.target.onerror = null;
                    e.target.src = PLACEHOLDER_IMAGE; 
                  }}
                />
                <div className="photo-overlay"></div>
              </div>
              <div className="player-info-mobile">
                <h4>{currentPlayer.name}</h4>
                <div className="player-meta">
                  <span className="player-category-mobile">{currentPlayer.category}</span>
                  <span className="player-base-price">Base: ₹{currentPlayer.basePrice}L</span>
                </div>
              </div>
            </div>

            {/* Timer */}
            <div className="timer-mobile" data-urgent={timerValue <= 5}>
              <div className="timer-content">
                <span className="timer-icon">{timerValue <= 5 ? '⚠️' : '⏱️'}</span>
                <div className="timer-info">
                  <span className="timer-label">Time Remaining</span>
                  <span className="timer-value-mobile">{timerValue}s</span>
                </div>
              </div>
              <div className="timer-bar" style={{ width: `${(timerValue / 20) * 100}%` }}></div>
            </div>

            {/* Current Bid */}
            <div className="current-bid-mobile" data-my-bid={isHighestBidder}>
              <div className="bid-info">
                <span className="bid-label-mobile">💰 Current Bid</span>
                <span className="bid-amount-mobile">₹{currentBid.amount}L</span>
                <div className="bid-team-info">
                  {isHighestBidder && <span className="winning-badge">🏆 You're Winning!</span>}
                  <span className="bid-team-mobile">{currentBid.teamName}</span>
                </div>
              </div>
            </div>

            {/* Bid Controls */}
            <div className="bid-controls">
              {isHighestBidder ? (
                <div className="highest-bidder-notice">
                  <div className="notice-icon">🏆</div>
                  <div>
                    <p className="notice-title">You're the Highest Bidder!</p>
                    <small>Wait for other teams to bid or win this player</small>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bid-buttons-group">
                    {hasNoBids && canBid(0) && (
                      <button 
                        className={`bid-button bid-button-base ${bidSuccess ? 'bid-success' : ''}`}
                        onClick={() => handleBid(0)}
                        disabled={!isConnected}
                      >
                        <span className="bid-button-icon">{bidSuccess ? '✓' : '🎯'}</span>
                        <span className="bid-button-text">
                          {bidSuccess ? 'Bid Placed!' : `₹${getNextBidAmount(0)}L`}
                        </span>
                        <span className="bid-button-label">{bidSuccess ? '' : 'Base Price'}</span>
                      </button>
                    )}
                    {canBid(10) && (
                      <button 
                        className={`bid-button ${bidSuccess ? 'bid-success' : ''}`}
                        onClick={() => handleBid(10)}
                        disabled={!isConnected}
                      >
                        <span className="bid-button-icon">{bidSuccess ? '✓' : '💰'}</span>
                        <span className="bid-button-text">
                          {bidSuccess ? 'Bid Placed!' : `₹${getNextBidAmount(10)}L`}
                        </span>
                        <span className="bid-button-label">{bidSuccess ? '' : '+₹10L'}</span>
                      </button>
                    )}
                    {canBid(20) && (
                      <button 
                        className={`bid-button ${bidSuccess ? 'bid-success' : ''}`}
                        onClick={() => handleBid(20)}
                        disabled={!isConnected}
                      >
                        <span className="bid-button-icon">{bidSuccess ? '✓' : '🚀'}</span>
                        <span className="bid-button-text">
                          {bidSuccess ? 'Bid Placed!' : `₹${getNextBidAmount(20)}L`}
                        </span>
                        <span className="bid-button-label">{bidSuccess ? '' : '+₹20L'}</span>
                      </button>
                    )}
                  </div>
                  {!canBid(0) && !canBid(10) && !canBid(20) && (
                    <div className="cannot-bid">
                      <div className="notice-icon">⛔</div>
                      <div>
                        {teamData.players && teamData.players.length >= MAX_SQUAD_SIZE ? (
                          <>
                            <p className="notice-title">Squad Full!</p>
                            <small>Maximum {MAX_SQUAD_SIZE} players reached. Cannot bid further.</small>
                          </>
                        ) : (
                          <>
                            <p className="notice-title">Insufficient Points</p>
                            <small>You only have ₹{teamData.remainingPoints}L remaining</small>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {error && <div className="error-message-mobile">{error}</div>}
          </div>
        ) : (
          <div className="waiting-section">
            <div className="waiting-animation">
              <div className="waiting-icon">⏳</div>
              <div className="pulse-ring"></div>
            </div>
            <h3>Waiting for Next Player</h3>
            <p>The admin will start the auction soon</p>
            <div className="waiting-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="tabs-navigation">
          <button 
            className={`tab-button ${!showAllPlayers ? 'active' : ''}`}
            onClick={() => setShowAllPlayers(false)}
          >
            <span>🏏</span> My Squad
          </button>
          <button 
            className={`tab-button ${showAllPlayers ? 'active' : ''}`}
            onClick={handleViewAllPlayers}
          >
            <span>📋</span> All Players
          </button>
        </div>

        {/* All Players View */}
        {showAllPlayers ? (
          <div className="all-players-section">
            {!loadingPlayers && allPlayers.length > 0 && (
              <div className="players-summary">
                <div className="summary-stat">
                  <span className="stat-value">{allPlayers.length}</span>
                  <span className="stat-label">Total</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-value">{allPlayers.filter(p => p.status === 'SOLD').length}</span>
                  <span className="stat-label">Sold</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-value">{allPlayers.filter(p => p.status === 'UNSOLD').length}</span>
                  <span className="stat-label">Available</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-value">{allPlayers.filter(p => p.status === 'IN_AUCTION').length}</span>
                  <span className="stat-label">In Auction</span>
                </div>
              </div>
            )}
            
            <div className="filter-buttons">
              <button 
                className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                onClick={() => setFilterStatus('all')}
              >
                All ({allPlayers.length})
              </button>
              <button 
                className={`filter-btn ${filterStatus === 'sold' ? 'active' : ''}`}
                onClick={() => setFilterStatus('sold')}
              >
                Sold ({allPlayers.filter(p => p.status === 'SOLD').length})
              </button>
              <button 
                className={`filter-btn ${filterStatus === 'unsold' ? 'active' : ''}`}
                onClick={() => setFilterStatus('unsold')}
              >
                Available ({allPlayers.filter(p => p.status === 'UNSOLD').length})
              </button>
              <button 
                className={`filter-btn ${filterStatus === 'remaining' ? 'active' : ''}`}
                onClick={() => setFilterStatus('remaining')}
              >
                In Auction ({allPlayers.filter(p => p.status === 'IN_AUCTION').length})
              </button>
            </div>

            {loadingPlayers ? (
              <div className="loading-players">
                <div className="spinner"></div>
                <p>Loading players...</p>
              </div>
            ) : allPlayers.length === 0 ? (
              <div className="no-players">
                <div className="no-players-icon">🏏</div>
                <h3>No Players Found</h3>
                <p>There are no players in the database yet.</p>
                <p className="hint">Players will appear here once they are added by the admin.</p>
              </div>
            ) : (
              <div className="players-list">
                {allPlayers
                  .filter(player => {
                    if (filterStatus === 'all') return true;
                    if (filterStatus === 'sold') return player.status === 'SOLD';
                    if (filterStatus === 'unsold') return player.status === 'UNSOLD';
                    if (filterStatus === 'remaining') return player.status === 'IN_AUCTION';
                    return true;
                  })
                  .map((player) => (
                    <div key={player._id} className={`player-list-item status-${player.status ? player.status.toLowerCase() : 'unknown'}`}>
                      <div className="player-list-info">
                        <div className="player-list-photo">
                          <img 
                            src={getOptimizedPlayerPhoto(player.photo)}
                            alt={player.name}
                            onError={(e) => { 
                              e.target.onerror = null;
                              e.target.src = PLACEHOLDER_IMAGE; 
                            }}
                          />
                        </div>
                        <div className="player-list-details">
                          <h4>{player.name}</h4>
                          <span className="player-list-category">{player.category}</span>
                        </div>
                      </div>
                      <div className="player-list-status">
                        {player.status === 'SOLD' && (
                          <>
                            <span className="status-badge sold">Sold</span>
                            <span className="sold-price">₹{player.soldPrice}L</span>
                            {player.soldTo && (
                              <span className="sold-team">{player.soldTo.teamName || player.soldTo}</span>
                            )}
                          </>
                        )}
                        {player.status === 'UNSOLD' && (
                          <>
                            <span className="status-badge unsold">Unsold</span>
                            <span className="base-price">Base: ₹{player.basePrice}L</span>
                          </>
                        )}
                        {player.status === 'IN_AUCTION' && (
                          <>
                            <span className="status-badge remaining">In Auction</span>
                            <span className="base-price">Base: ₹{player.basePrice}L</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                {allPlayers.filter(player => {
                  if (filterStatus === 'all') return true;
                  if (filterStatus === 'sold') return player.status === 'SOLD';
                  if (filterStatus === 'unsold') return player.status === 'UNSOLD';
                  if (filterStatus === 'remaining') return player.status === 'IN_AUCTION';
                  return true;
                }).length === 0 && (
                  <div className="no-players">
                    <p>No players found in this category</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* My Squad */
          teamData.players && teamData.players.length > 0 && (
          <div className="my-squad">
            <div className="squad-header">
              <div>
                <h3>🏏 My Squad</h3>
                <span className="squad-count">{teamData.players.length} player{teamData.players.length !== 1 ? 's' : ''}</span>
              </div>
              <a 
                href={`${API_URL}/teams/${teamData.id}/download`} 
                download 
                className="download-squad-btn"
              >
                <span>📥</span> Download
              </a>
            </div>
            <div className="squad-list">
              {teamData.players.map((player) => (
                <div key={player._id || player.name} className="squad-player">
                  <div className="squad-player-photo">
                    <img 
                      src={getOptimizedPlayerPhoto(player.photo)}
                      alt={player.name}
                      onError={(e) => { 
                        e.target.onerror = null;
                        e.target.src = PLACEHOLDER_IMAGE; 
                      }}
                    />
                  </div>
                  <div className="squad-player-info">
                    <span className="squad-player-name">{player.name}</span>
                    <span className="squad-player-category">{player.category}</span>
                  </div>
                  <span className="squad-player-price">₹{player.soldPrice}L</span>
                </div>
              ))}
            </div>
            <div className="squad-summary">
              <div className="summary-item">
                <span className="summary-label">Total Spent</span>
                <span className="summary-value">₹{teamData.players.reduce((sum, p) => sum + p.soldPrice, 0)}L</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Avg Price</span>
                <span className="summary-value">₹{Math.round(teamData.players.reduce((sum, p) => sum + p.soldPrice, 0) / teamData.players.length)}L</span>
              </div>
            </div>
          </div>
          )
        )}
      </div>
    </div>
  );
}

export default App;

