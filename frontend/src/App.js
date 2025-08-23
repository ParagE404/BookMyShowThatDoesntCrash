// src/App.jsx
import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import Login from './components/Login';
import QueueStatus from './components/QueueStatus';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for token on initial load
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <div>
        <header>
          <h1>Coldplay Ticket Queue</h1>
          {isAuthenticated && (
            <button onClick={handleLogout}>Logout</button>
          )}
        </header>

        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/queue" replace />
              ) : (
                <Login onLogin={handleLogin} />
              )
            }
          />

          <Route
            path="/queue"
            element={
              isAuthenticated ? (
                <QueueStatus eventId="coldplay-mumbai-2025" />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Redirect any other path to login */}
          <Route
            path="*"
            element={
              isAuthenticated ? (
                <Navigate to="/queue" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
