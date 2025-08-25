// frontend/src/hooks/useQueue.js
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

export function useQueue(eventId, token) {
  const [position, setPosition] = useState(null);
  const [estimatedWait, setEstimatedWait] = useState(null);
  const [isAdvanced, setIsAdvanced] = useState(false);
  const socketRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;

    // Connect with auth token
    socketRef.current = io('http://localhost:3000', {
      auth: { token }
    });
    
    socketRef.current.on('connect_error', (err) => {
      console.error('Socket auth error:', err);
    });

    // Join the queue room
    socketRef.current.emit('join-queue', { eventId });

    // Listen for position updates
    socketRef.current.on('position-update', (data) => {
      console.log('Received position-update:', data);
      setPosition(data.position);
      setEstimatedWait(data.estimatedWaitTime.humanReadable);
    });

    // Listen for queue advancement (user's turn to book!)
    socketRef.current.on('queue-advanced', (data) => {
      console.log('🎉 Queue advanced! Moving to booking:', data);
      setIsAdvanced(true);
      
      // Navigate to booking page after 2 seconds (show celebration first)
      setTimeout(() => {
        navigate(`/booking/${eventId}`);
      }, 2000);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [eventId, token, navigate]);

  return { position, estimatedWait, isAdvanced };
}
