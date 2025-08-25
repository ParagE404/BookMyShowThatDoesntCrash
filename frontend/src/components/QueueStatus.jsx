// frontend/src/components/QueueStatus.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useQueue } from '../hooks/useQueue';
import './QueueStatus.css'; // We'll add some styling

export default function QueueStatus({ eventId }) {
  const token = localStorage.getItem('accessToken');
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState(null);
  const { position, estimatedWait, isAdvanced } = useQueue(eventId, token);

  useEffect(() => {
    async function join() {
      console.log('🔍 Attempting to join queue...', { token, eventId, joined });
      
      if (!token) {
        console.error('❌ No token available');
        return;
      }
      
      try {
        console.log('📡 Making API call to /api/queue/join');
        const response = await axios.post(
          '/api/queue/join',
          { eventId },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        console.log('✅ Successfully joined queue:', response.data);
        setJoined(true);
      } catch (err) {
        const errorMsg = err.response?.data?.error?.message || 'Failed to join queue';
        console.error('❌ Queue join error:', err);
        console.error('❌ Error response:', err.response?.data);
        setError(errorMsg);
      }
    }
  
    console.log('🔍 useEffect conditions:', { token: !!token, eventId, joined });
    if (token && eventId && !joined) {
      join();
    }
  }, [token, eventId, joined]);

  if (error) {
    return (
      <div className="queue-error">
        <h3>❌ Error</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="queue-loading">
        <div className="spinner"></div>
        <p>Joining queue...</p>
      </div>
    );
  }

  // User got advanced to booking!
  if (isAdvanced) {
    return (
      <div className="queue-advanced">
        <div className="celebration">
          <h2>🎉 It's Your Turn!</h2>
          <p>You've been selected for booking!</p>
          <p>Redirecting to booking page...</p>
          <div className="progress-bar">
            <div className="progress-fill"></div>
          </div>
        </div>
      </div>
    );
  }

  // Normal queue waiting state
  return (
    <div className="queue-status">
      <div className="queue-header">
        <h2>🎫 Coldplay Mumbai 2025</h2>
        <p className="queue-subtitle">You're in the virtual queue</p>
      </div>

      <div className="queue-info">
        <div className="position-card">
          <h3>Your Position</h3>
          <div className="position-number">
            {position ?? '...'}
          </div>
          <p className="position-detail">
            {position && position > 1 ? `${position - 1} people ahead of you` : 'You\'re next!'}
          </p>
        </div>

        <div className="wait-time-card">
          <h3>Estimated Wait</h3>
          <div className="wait-time">
            {estimatedWait ?? '...'}
          </div>
          <p className="wait-detail">
            Based on current processing speed
          </p>
        </div>
      </div>

      <div className="queue-tips">
        <h4>💡 Tips while you wait:</h4>
        <ul>
          <li>Keep this page open</li>
          <li>Your position updates automatically</li>
          <li>You'll be notified when it's your turn</li>
          <li>Have your payment details ready</li>
        </ul>
      </div>
    </div>
  );
}
