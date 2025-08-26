// frontend/src/components/BookingTimer.jsx
import React, { useState, useEffect } from 'react';
import './BookingTimer.css';

export default function BookingTimer({ expiresAt, onExpiry }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const difference = expiry - now;

      if (difference > 0) {
        setTimeLeft(difference);
        setIsExpired(false);
      } else {
        setTimeLeft(0);
        setIsExpired(true);
        if (onExpiry) onExpiry();
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpiry]);

  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    const totalDuration = 10 * 60 * 1000; // 10 minutes in milliseconds
    return Math.max(0, (timeLeft / totalDuration) * 100);
  };

  if (isExpired) {
    return (
      <div className="booking-timer expired">
        <span className="timer-icon">⏰</span>
        <span className="timer-text">Session Expired</span>
      </div>
    );
  }

  return (
    <div className="booking-timer">
      <div className="timer-content">
        <span className="timer-icon">⏰</span>
        <div className="timer-info">
          <span className="timer-label">Session expires in</span>
          <span className={`timer-display ${timeLeft < 60000 ? 'urgent' : ''}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>
      
      <div className="timer-progress">
        <div 
          className="progress-bar"
          style={{ width: `${getProgressPercentage()}%` }}
        ></div>
      </div>
    </div>
  );
}
