import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';

// const SOCKET_URL = 'https://aplplayerauction.onrender.com/';
// const API_URL = 'https://aplplayerauction.onrender.com/api';

const SOCKET_URL = 'http://localhost:5000/'
const API_URL = 'http://localhost:5000/api'

// Default placeholder image (SVG data URL)
const PLACEHOLDER_IMAGE = `${SOCKET_URL}/uploads/placeholder.jpg`;
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

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    // Check for saved credentials on mount
    const savedTeamId = localStorage.getItem('captain_teamId');
    const savedPin = localStorage.getItem('captain_pin');
    
    if (savedTeamId && savedPin) {
      setTeamId(savedTeamId);
      setPin(savedPin);
      // Auto-login with saved credentials
      newSocket.emit('team:login', { teamId: savedTeamId, pin: savedPin });
    }

    // Auth events
    newSocket.on('auth:success', (data) => {
      if (data.team) {
        setIsAuthenticated(true);
        setTeamData(data.team);
        setError('');
      }
    });

    newSocket.on('auth:error', (data) => {
      setError(data.message);
      // Clear invalid credentials
      localStorage.removeItem('captain_teamId');
      localStorage.removeItem('captain_pin');
    });

    // Auction events
    newSocket.on('auction:started', (data) => {
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
      // Check if this is our bid
      setTeamData(prev => {
        if (prev && data.teamId === prev.id) {
          setBidSuccess(true);
          setTimeout(() => setBidSuccess(false), 2000);
        }
        return prev;
      });
    });

    newSocket.on('timer:update', (data) => {
      setTimerValue(data.value);
    });

    newSocket.on('timer:reset', (data) => {
      setTimerValue(data.value);
    });

    newSocket.on('player:sold', (data) => {
      setTeamData(prev => {
        if (prev && data.team && data.team.id === prev.id) {
          // Update team data
          return {
            ...prev,
            remainingPoints: prev.remainingPoints - data.amount,
            rosterSlotsFilled: prev.rosterSlotsFilled + 1,
            players: [...prev.players, data.player],
            maxBid: prev.remainingPoints - data.amount - ((14 - (prev.rosterSlotsFilled + 1)) * 30)
          };
        }
        return prev;
      });
      setCurrentPlayer(null);
    });

    newSocket.on('bid:error', (data) => {
      setError(data.message);
      setTimeout(() => setError(''), 3000);
    });

    newSocket.on('bid:success', () => {
      setBidSuccess(true);
      setTimeout(() => setBidSuccess(false), 2000);
    });

    return () => {
      newSocket.close();
    };
  }, []); // Empty dependency array - socket should only be created once

  const handleLogin = (e) => {
    e.preventDefault();
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
    window.location.reload();
  };

  const handleBid = (increment = 5) => {
    if (!socket || !teamData || !currentPlayer) return;

    const nextBid = currentBid.amount + increment;
    const maxBid = teamData.maxBid;

    if (nextBid > maxBid) {
      setError(`Maximum allowed bid is ${maxBid}`);
      setTimeout(() => setError(''), 3000);
      return;
    }

    socket.emit('bid:place', { amount: nextBid });
  };

  const hasNoBids = currentBid.teamName === 'Base Price' || !currentBid.teamName || currentBid.teamName === 'No Bids Yet';

  const getNextBidAmount = (increment = 5) => {
    // If no bids yet and increment is 0, return base price
    if (increment === 0 && hasNoBids) {
      return currentBid.amount;
    }
    return currentBid.amount + increment;
  };

  const canBid = (increment = 5) => {
    if (!teamData || !currentPlayer) return false;
    const nextBid = getNextBidAmount(increment);
    return nextBid <= teamData.maxBid && nextBid <= teamData.remainingPoints;
  };

  const isHighestBidder = currentBid.teamName === teamData?.teamName;

  if (!isAuthenticated) {
    return (
      <div className="app">
        <div className="login-container">
          <div className="login-card">
            <h1 className="app-title">🏏 Cricket Auction</h1>
            <h2>Captain Login</h2>
            
            <form onSubmit={handleLogin} className="login-form">
              <div className="form-group">
                <label>Team ID</label>
                <input
                  type="text"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  placeholder="TEAM01"
                  required
                />
              </div>

              <div className="form-group">
                <label>PIN</label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter 4-digit PIN"
                  maxLength="4"
                  required
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <button type="submit" className="login-button">
                Login
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="captain-dashboard">
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <h2>{teamData.teamName}</h2>
            <p className="captain-name">{teamData.captainName}</p>
          </div>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>

        {/* Budget Panel */}
        <div className="budget-panel">
          <div className="budget-item">
            <span className="budget-label">Remaining Points</span>
            <span className="budget-value">{teamData.remainingPoints}</span>
          </div>
          <div className="budget-item">
            <span className="budget-label">Max Bid</span>
            <span className="budget-value">{teamData.maxBid}</span>
          </div>
          <div className="budget-item">
            <span className="budget-label">Squad</span>
            <span className="budget-value">{teamData.rosterSlotsFilled}/14</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-label">Squad Progress</div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${(teamData.rosterSlotsFilled / 14) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Current Player */}
        {currentPlayer ? (
          <div className="current-player-section">
            <h3>Current Player</h3>
            <div className="player-card-mobile">
              <img 
                src={currentPlayer.photo?.startsWith('http') ? currentPlayer.photo : `${API_URL}${currentPlayer.photo}`} 
                alt={currentPlayer.name}
                className="player-photo-mobile"
                onError={(e) => e.target.src = PLACEHOLDER_IMAGE}
              />
              <div className="player-info-mobile">
                <h4>{currentPlayer.name}</h4>
                <span className="player-category-mobile">{currentPlayer.category}</span>
              </div>
            </div>

            {/* Timer */}
            <div className="timer-mobile" data-urgent={timerValue <= 5}>
              <span className="timer-label">Time Left</span>
              <span className="timer-value-mobile">{timerValue}s</span>
            </div>

            {/* Current Bid */}
            <div className="current-bid-mobile">
              <div className="bid-info">
                <span className="bid-label-mobile">Current Bid</span>
                <span className="bid-amount-mobile">{currentBid.amount}</span>
                <span className="bid-team-mobile">{currentBid.teamName}</span>
              </div>
            </div>

            {/* Bid Button */}
            <div className="bid-controls">
              {isHighestBidder ? (
                <div className="cannot-bid">
                  <p>✓ You're the Highest Bidder</p>
                  <small>Wait for other teams to bid</small>
                </div>
              ) : (
                <div className="bid-buttons-group">
                  {hasNoBids && canBid(0) && (
                    <button 
                      className={`bid-button bid-button-base ${bidSuccess ? 'bid-success' : ''}`}
                      onClick={() => handleBid(0)}
                    >
                      <span className="bid-button-text">
                        {bidSuccess ? '✓ Bid Placed!' : `₹${getNextBidAmount(0)} (Base)`}
                      </span>
                    </button>
                  )}
                  {canBid(5) && (
                    <button 
                      className={`bid-button ${bidSuccess ? 'bid-success' : ''}`}
                      onClick={() => handleBid(5)}
                    >
                      <span className="bid-button-text">
                        {bidSuccess ? '✓ Bid Placed!' : `+₹5 (₹${getNextBidAmount(5)})`}
                      </span>
                    </button>
                  )}
                  {canBid(10) && (
                    <button 
                      className={`bid-button ${bidSuccess ? 'bid-success' : ''}`}
                      onClick={() => handleBid(10)}
                    >
                      <span className="bid-button-text">
                        {bidSuccess ? '✓ Bid Placed!' : `+₹10 (₹${getNextBidAmount(10)})`}
                      </span>
                    </button>
                  )}
                  {!canBid(0) && !canBid(5) && !canBid(10) && (
                    <div className="cannot-bid">
                      <p>Cannot bid higher</p>
                      <small>Exceeds maximum allowed bid</small>
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && <div className="error-message-mobile">{error}</div>}
          </div>
        ) : (
          <div className="waiting-section">
            <div className="waiting-icon">⏳</div>
            <h3>Waiting for Next Player...</h3>
            <p>Admin will start the auction soon</p>
          </div>
        )}

        {/* My Squad */}
        {teamData.players && teamData.players.length > 0 && (
          <div className="my-squad">
            <div className="squad-header">
              <h3>My Squad ({teamData.players.length})</h3>
              <a 
                href={`${API_URL}/teams/${teamData.id}/download`} 
                download 
                className="download-squad-btn"
              >
                📥 Download Squad
              </a>
            </div>
            <div className="squad-list">
              {teamData.players.map((player, index) => (
                <div key={index} className="squad-player">
                  <span className="squad-player-name">{player.name}</span>
                  <span className="squad-player-category">{player.category}</span>
                  <span className="squad-player-price">{player.soldPrice}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

