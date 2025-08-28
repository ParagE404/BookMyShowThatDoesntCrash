// frontend/src/components/QueueStatus.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import axios from "axios";
import { apiClient } from '../config/api';
import { useQueue } from "../hooks/useQueue";
import "./QueueStatus.css";

export default function QueueStatus() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("accessToken");
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Debug logs for troubleshooting
  console.log("🔍 QueueStatus component loaded with:", { eventId, hasToken: !!token });

  // Redirect if no eventId in URL
  useEffect(() => {
    if (!eventId) {
      console.error("❌ No eventId found in URL params, redirecting to event selection");
      navigate('/choose-event');
      return;
    }
  }, [eventId, navigate]);

  // Only call useQueue hook if we have eventId
  const { position, estimatedWait, isAdvanced } = useQueue(eventId || null, token);

  useEffect(() => {
    async function joinQueue() {
      // Guard clauses - ensure we have everything we need
      if (!token) {
        console.error("❌ No token available");
        setError("Authentication required. Please log in again.");
        setLoading(false);
        return;
      }

      if (!eventId) {
        console.error("❌ No eventId available");
        setError("Invalid event. Please select an event first.");
        setLoading(false);
        return;
      }

      if (joined) {
        console.log("✅ Already joined queue, skipping");
        setLoading(false);
        return;
      }

      try {
        console.log("📡 Making API call to /api/queue/join with:", { eventId });
        
        const response = await apiClient.post(
          "/api/queue/join",
          { eventId }// Make sure eventId is being passed
          
        );
        
        console.log("✅ Successfully joined queue:", response.data);
        setJoined(true);
        setError(null);
      } catch (err) {
        console.error("❌ Queue join error:", err);
        console.error("❌ Error response:", err.response?.data);
        
        let errorMsg = "Failed to join queue";
        if (err.response?.data?.error?.message) {
          errorMsg = err.response.data.error.message;
        } else if (err.response?.status === 401) {
          errorMsg = "Authentication expired. Please log in again.";
        } else if (err.response?.status === 404) {
          errorMsg = "Event not found. Please select a valid event.";
        }
        
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    }

    // Only attempt to join if we have all required data
    if (token && eventId && !joined && loading) {
      joinQueue();
    }
  }, [token, eventId, joined, loading]);

  // Redirect to booking page when advanced
  useEffect(() => {
    if (isAdvanced && eventId) {
      console.log("🎉 User advanced! Redirecting to booking page...");
      // Small delay to show celebration message
      setTimeout(() => {
        navigate(`/booking/${eventId}`);
      }, 3000);
    }
  }, [isAdvanced, eventId, navigate]);

  // Early return if no eventId (before redirect completes)
  if (!eventId) {
    return (
      <div className="queue-error">
        <h3>❌ Invalid Event</h3>
        <p>No event selected. Redirecting...</p>
        <div className="spinner"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="queue-error">
        <h3>❌ Error</h3>
        <p>{error}</p>
        <div className="error-actions">
          <button 
            className="btn btn-primary" 
            onClick={() => {
              setError(null);
              setJoined(false);
              setLoading(true);
            }}
          >
            Try Again
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/choose-event')}
          >
            Choose Different Event
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading || !joined) {
    return (
      <div className="queue-loading">
        <div className="spinner"></div>
        <p>Joining queue for event: {eventId}...</p>
        <small>Please wait while we add you to the virtual queue</small>
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
        <h2>🎫 Queue Status</h2>
        <p className="queue-subtitle">You're in the virtual queue for: <strong>{eventId}</strong></p>
      </div>

      <div className="queue-info">
        <div className="position-card">
          <h3>Your Position</h3>
          <div className="position-number">{position ?? "..."}</div>
          <p className="position-detail">
            {position && position > 1
              ? `${position - 1} people ahead of you`
              : position === 1 
              ? "You're next!"
              : "Calculating position..."}
          </p>
        </div>

        <div className="wait-time-card">
          <h3>Estimated Wait</h3>
          <div className="wait-time">{estimatedWait ?? "Calculating..."}</div>
          <p className="wait-detail">Based on current processing speed</p>
        </div>
      </div>

      <div className="queue-status-indicator">
        <div className="status-dot active"></div>
        <span>Queue Active - You're in line!</span>
      </div>

      <div className="queue-tips">
        <h4>💡 Tips while you wait:</h4>
        <ul>
          <li>✅ Keep this page open</li>
          <li>✅ Your position updates automatically every 5 seconds</li>
          <li>✅ You'll be notified when it's your turn</li>
          <li>✅ Have your payment details ready</li>
          <li>✅ Don't refresh the page or you'll lose your position</li>
        </ul>
      </div>

      <div className="queue-actions">
        <button 
          className="btn btn-secondary"
          onClick={() => {
            if (window.confirm('Are you sure you want to leave the queue? You will lose your position.')) {
              navigate('/choose-event');
            }
          }}
        >
          Leave Queue
        </button>
      </div>
    </div>
  );
}
