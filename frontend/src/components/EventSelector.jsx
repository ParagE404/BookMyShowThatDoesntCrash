// src/components/EventSelector.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvents } from '../hooks/useEvents';

export default function EventSelector({ token }) {
  const { events, loading } = useEvents(token);
  const navigate = useNavigate();

  if (loading) return <div className="spinner">Loading events...</div>;

  return (
    <div className="container" style={{ maxWidth: 700 }}>
      <h2 style={{ color: 'var(--bms-primary)', marginBlock: 20 }}>🎟️ Choose an Event</h2>
      <div className="event-list">
        {events.map(ev => (
          <div className="card" key={ev.id} style={{ marginBlock: 12 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 22 }}>{ev.name}</div>
              <div style={{ color: '#aaa' }}>{ev.venue} | {new Date(ev.event_date).toLocaleString()}</div>
              <div style={{ marginTop: 8 }}>{ev.description}</div>
            </div>
            <button
              className="btn btn-primary"
              style={{ marginTop: 12 }}
              onClick={() => navigate(`/queue/${ev.id}`)}
            >
              Enter Queue
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
