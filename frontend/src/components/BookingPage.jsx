// frontend/src/components/BookingPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function BookingPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(10 * 60); // 10 minutes in seconds
  const [isExpired, setIsExpired] = useState(false);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsExpired(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBookTickets = async () => {
    try {
      // This would integrate with Step 3: Distributed Ticket Booking
      console.log('Booking tickets for', eventId);
      alert('🎉 Tickets booked successfully! (This will be implemented in Step 3)');
      navigate('/booking-confirmation');
    } catch (error) {
      console.error('Booking failed:', error);
      alert('❌ Booking failed. Please try again.');
    }
  };

  if (isExpired) {
    return (
      <div className="booking-expired">
        <h2>⏰ Time Expired</h2>
        <p>Your booking window has expired.</p>
        <button onClick={() => navigate('/queue')}>
          Join Queue Again
        </button>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <div className="booking-header">
        <h2>🎫 Book Your Tickets</h2>
        <div className="timer">
          <span>Time remaining: </span>
          <span className="timer-countdown">{formatTime(timeLeft)}</span>
        </div>
      </div>

      <div className="event-details">
        <h3>Coldplay: Music Of The Spheres World Tour</h3>
        <p>📍 DY Patil Stadium, Mumbai</p>
        <p>📅 January 19, 2025 • 7:00 PM</p>
      </div>

      <div className="ticket-selection">
        <h4>Select Your Tickets</h4>
        
        <div className="ticket-options">
          <div className="ticket-type">
            <h5>Silver - ₹2,500</h5>
            <p>General seating area</p>
            <select>
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </div>

          <div className="ticket-type">
            <h5>Gold - ₹7,500</h5>
            <p>Premium seating with better view</p>
            <select>
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </div>

          <div className="ticket-type">
            <h5>Platinum - ₹12,500</h5>
            <p>VIP seating closest to stage</p>
            <select>
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </div>
        </div>
      </div>

      <div className="booking-actions">
        <button 
          className="book-button"
          onClick={handleBookTickets}
        >
          Book Tickets Now
        </button>
        
        <button 
          className="cancel-button"
          onClick={() => navigate('/queue')}
        >
          Return to Queue
        </button>
      </div>
    </div>
  );
}
