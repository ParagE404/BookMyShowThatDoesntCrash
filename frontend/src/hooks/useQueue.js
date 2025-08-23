import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

export function useQueue(eventId, token) {
    console.log('useQueue called with eventId:', eventId, 'and token:', token);
  const [position, setPosition] = useState(null);
  const [estimatedWait, setEstimatedWait] = useState(null);
  const socketRef = useRef();

  useEffect(() => {
     // Only connect if we have a token
     if (!token) {
        console.log('No token provided, not connecting to socket');
        return;
     }
    // Connect with auth token
    socketRef.current = io('http://localhost:3000', {
      auth: { token }
    });
    
    socketRef.current.on('connect_error', (err) => {
      console.error('Socket auth error:', err);
    });

    socketRef.current.emit('join-queue', { eventId });

    socketRef.current.on('position-update', (data) => {
      setPosition(data.position);
      setEstimatedWait(data.estimatedWaitTime.humanReadable);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [eventId, token]);

  return { position, estimatedWait };
}
