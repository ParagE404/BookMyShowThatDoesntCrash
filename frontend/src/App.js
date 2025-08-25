// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import Login from './components/Login';
import QueueStatus from './components/QueueStatus';
import BookingPage from './components/BookingPage'; // New import

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
        <header style={{ padding: '20px', background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
          <h1>🎫 Coldplay Ticket Queue</h1>
          {isAuthenticated && (
            <button onClick={handleLogout} style={{ float: 'right' }}>
              Logout
            </button>
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

          {/* New booking route */}
          <Route
            path="/booking/:eventId"
            element={
              isAuthenticated ? (
                <BookingPage />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

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
