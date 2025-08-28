// src/hooks/useEvents.js
import { useState, useEffect } from "react";
import { apiClient } from "../config/api";

export function useEvents(token) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    apiClient.get("/api/inventory/events").then((res) => {
      setEvents(res.data.data || []);
      setLoading(false);
    });
  }, [token]);

  return { events, loading };
}
