// frontend/src/components/BookingPage.jsx (continued)
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../config/api";
import SeatMap from "./SeatMap";
import BookingTimer from "./BookingTimer";
import PaymentSection from "./PaymentSection";
import "./BookingPage.css";

export default function BookingPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [booking, setBooking] = useState(null);
  const [step, setStep] = useState("selection"); // selection, payment, confirmation
  const [error, setError] = useState(null);


  const fetchAvailableSeats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(
        `/api/inventory/events/${eventId}/seats?limit=50`
      );

      console.log("API Response:", response.data); // Debug log

      // Extract the availableSeats array from the response
      const seatsData = response.data.data?.seats || [];
      console.log("Seats data:", seatsData); // Debug log

      setSeats(Array.isArray(seatsData) ? seatsData : []);
      setLoading(false);
    } catch (error) {
      console.error("Fetch seats error:", error);
      setError("Failed to load seats. Please try again.");
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchAvailableSeats();
  }, [fetchAvailableSeats]);
  const handleSeatSelect = (seat) => {
    if (selectedSeats.find((s) => s.id === seat.id)) {
      // Deselect seat
      setSelectedSeats((prev) => prev.filter((s) => s.id !== seat.id));
    } else if (selectedSeats.length < 6) {
      // Select seat (max 6 like BookMyShow)
      setSelectedSeats((prev) => [...prev, seat]);
    }
  };

  const handleProceedToPayment = async () => {
    if (selectedSeats.length === 0) return;

    try {
      setLoading(true);

      // Create booking
      const seatIds = selectedSeats.map((seat) => seat.id);
      const bookingResponse = await apiClient.post(
        "/api/booking/create",
        {
          eventId,
          seatIds,
          durationMinutes: 10,
         }
      );

      setBooking(bookingResponse.data.data);
      setStep("payment");
      setLoading(false);
    } catch (error) {
      setError(
        "Failed to create booking. Some seats may no longer be available."
      );
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (paymentData) => {
    setBooking((prev) => ({ ...prev, ...paymentData }));
    setStep("confirmation");
  };

  const calculateTotal = () => {
    return selectedSeats.reduce(
      (total, seat) => total + parseFloat(seat.price),
      0
    );
  };

  if (loading && step === "selection") {
    return (
      <div className="booking-loading">
        <div className="spinner"></div>
        <p>Loading available seats...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="booking-error">
        <h2>⚠️ Booking Error</h2>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => navigate("/queue")}>
          Back to Queue
        </button>
      </div>
    );
  }

  return (
    <div className="booking-page">
      {/* Header */}
      <header className="booking-header">
        <div className="container">
          <div className="event-info">
            <h1>🎵 Coldplay: Music Of The Spheres World Tour</h1>
            <div className="event-details">
              <span className="venue">📍 DY Patil Stadium, Mumbai</span>
              <span className="date">📅 Jan 19, 2025 • 7:00 PM</span>
            </div>
          </div>

          {booking && (
            <BookingTimer
              expiresAt={booking.booking_expires_at}
              onExpiry={() => navigate("/queue")}
            />
          )}
        </div>
      </header>

      <div className="container">
        {step === "selection" && (
          <SeatSelectionStep
            seats={seats}
            selectedSeats={selectedSeats}
            onSeatSelect={handleSeatSelect}
            onProceed={handleProceedToPayment}
            total={calculateTotal()}
            loading={loading}
          />
        )}

        {step === "payment" && (
          <PaymentSection
            booking={booking}
            selectedSeats={selectedSeats}
            onPaymentSuccess={handlePaymentSuccess}
            onBack={() => setStep("selection")}
          />
        )}

        {step === "confirmation" && (
          <BookingConfirmation
            booking={booking}
            selectedSeats={selectedSeats}
          />
        )}
      </div>
    </div>
  );
}

// Seat Selection Step Component
function SeatSelectionStep({
  seats,
  selectedSeats,
  onSeatSelect,
  onProceed,
  total,
  loading,
}) {
  return (
    <div className="seat-selection-step">
      <div className="seat-selection-container">
        <div className="seat-map-section">
          <SeatMap
            seats={seats}
            selectedSeats={selectedSeats}
            onSeatSelect={onSeatSelect}
          />
        </div>

        <div className="booking-summary">
          <div className="card">
            <h3>Booking Summary</h3>

            {selectedSeats.length > 0 ? (
              <>
                <div className="selected-seats">
                  {selectedSeats.map((seat) => (
                    <div key={seat.id} className="selected-seat">
                      <span className="seat-info">
                        {seat.category_name} - {seat.seat_number}
                      </span>
                      <span className="seat-price">₹{seat.price}</span>
                    </div>
                  ))}
                </div>

                <div className="total-section">
                  <div className="total-amount">
                    <span>Total: ₹{total.toLocaleString()}</span>
                  </div>

                  <button
                    className="btn btn-primary proceed-btn"
                    onClick={onProceed}
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="spinner" />
                    ) : (
                      "Proceed to Payment"
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="no-seats-selected">
                <p>Select seats to continue</p>
                <div className="seat-legend">
                  <div className="legend-item">
                    <div className="legend-color available"></div>
                    <span>Available</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color selected"></div>
                    <span>Selected</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color booked"></div>
                    <span>Booked</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Booking Confirmation Component
function BookingConfirmation({ booking, selectedSeats }) {
  return (
    <div className="booking-confirmation">
      <div className="confirmation-card">
        <div className="success-icon">
          <div className="checkmark">✓</div>
        </div>

        <h2>Booking Confirmed!</h2>
        <p className="confirmation-message">
          Your tickets have been successfully booked.
        </p>

        <div className="booking-details">
          <div className="detail-row">
            <span>Booking ID:</span>
            <span className="booking-id">{booking.id}</span>
          </div>
          <div className="detail-row">
            <span>Payment ID:</span>
            <span>{booking.payment_id}</span>
          </div>
          <div className="detail-row">
            <span>Total Amount:</span>
            <span className="amount">
              ₹{parseFloat(booking.total_amount).toLocaleString()}
            </span>
          </div>
          <div className="detail-row">
            <span>Seats:</span>
            <div className="seats-list">
              {selectedSeats.map((seat) => (
                <span key={seat.id} className="seat-tag">
                  {seat.category_name} - {seat.seat_number}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="confirmation-actions">
          <button className="btn btn-primary">Download Tickets</button>
          <button className="btn btn-secondary">View Booking Details</button>
        </div>
      </div>
    </div>
  );
}
