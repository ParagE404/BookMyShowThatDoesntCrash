import React from 'react';
import { useQueue } from '../hooks/useQueue';

export default function QueueStatus({ eventId }) {
  const token = localStorage.getItem('accessToken');  // Ensure this matches your login flow
  console.log('Token from localStorage:', token);
  const { position, estimatedWait } = useQueue(eventId, token);

  if (!token) {
    return <p>Please login to join the queue.</p>;
  }

  if (position === null) {
    return <p>Joining queue...</p>;
  }

  return (
    <div>
      <h3>Your position: {position}</h3>
      <p>Estimated wait: {estimatedWait}</p>
    </div>
  );
}
