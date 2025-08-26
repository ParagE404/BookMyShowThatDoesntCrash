// Update frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register'; // Add this import
import QueueStatus from './components/QueueStatus';
import BookingPage from './components/BookingPage';
import './BookMyShowHeader.css';

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

  const handleRegister = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <div className="app">
        {/* BookMyShow Style Header */}
        <header className="bms-header">
          <div className="container">
            <div className="header-content">
              <div className="brand">
                <h1>🎫 BookMyShow</h1>
                <span className="tagline">Coldplay Special</span>
              </div>
              
              {isAuthenticated && (
                <div className="header-actions">
                  <span className="user-info">
                    Welcome to the queue!
                  </span>
                  <button 
                    className="btn btn-secondary logout-btn"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="main-content">
          <Routes>
            <Route
              path="/register"
              element={
                isAuthenticated ? (
                  <Navigate to="/queue" replace />
                ) : (
                  <Register onRegister={handleRegister} />
                )
              }
            />

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
                  <Navigate to="/register" replace />
                )
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
