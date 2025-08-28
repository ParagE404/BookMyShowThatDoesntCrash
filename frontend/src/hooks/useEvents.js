// src/hooks/useEvents.js
import { useState, useEffect } from 'react';
import axios from 'axios';

export function useEvents(token) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    axios.get('/api/inventory/events', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setEvents(res.data.data || []);
      setLoading(false);
    });
  }, [token]);

  return { events, loading };
}
