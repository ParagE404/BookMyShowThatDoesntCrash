// frontend/src/components/PaymentSection.jsx
import React, { useState } from "react";
import { apiClient } from '../config/api';
import "./PaymentSection.css";

export default function PaymentSection({
  booking,
  selectedSeats,
  onPaymentSuccess,
  onBack,
}) {
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [error, setError] = useState(null);


  const handlePayment = async () => {
    try {
      setProcessing(true);
      setError(null);

      // Create payment intent
      const intentResponse = await apiClient.post(
        "/api/payment/create-intent",
        { bookingId: booking.id }
        
      );

      // Simulate payment processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulate payment
      await apiClient.post(
        "/api/payment/simulate-payment",
        {
          paymentIntentId: intentResponse.data.data.paymentIntentId,
          bookingId: booking.id,
          success: true,
        }
      );

      onPaymentSuccess({
        status: "confirmed",
        payment_id: intentResponse.data.data.paymentIntentId,
        payment_status: "completed",
      });
    } catch (error) {
      setError("Payment failed. Please try again.");
      setProcessing(false);
    }
  };

  return (
    <div className="payment-section">
      <div className="payment-container">
        {/* Booking Summary */}
        <div className="booking-summary-card">
          <h3>Booking Summary</h3>

          <div className="event-info">
            <h4>🎵 Coldplay: Music Of The Spheres World Tour</h4>
            <p>📍 DY Patil Stadium, Mumbai</p>
            <p>📅 Jan 19, 2025 • 7:00 PM</p>
          </div>

          <div className="selected-seats-summary">
            <h5>Selected Seats ({selectedSeats.length})</h5>
            {selectedSeats.map((seat) => (
              <div key={seat.id} className="seat-summary-item">
                <span>
                  {seat.category_name} - {seat.seat_number}
                </span>
                <span>₹{seat.price}</span>
              </div>
            ))}
          </div>

          <div className="price-breakdown">
            <div className="price-row">
              <span>Subtotal</span>
              <span>₹{parseFloat(booking.total_amount).toLocaleString()}</span>
            </div>
            <div className="price-row">
              <span>Convenience Fee</span>
              <span>₹0</span>
            </div>
            <div className="price-row total">
              <span>Total Amount</span>
              <span>₹{parseFloat(booking.total_amount).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div className="payment-form-card">
          <h3>Payment Details</h3>

          {error && (
            <div className="payment-error">
              <span>❌ {error}</span>
            </div>
          )}

          <div className="payment-methods">
            <div className="payment-method-tabs">
              <button
                className={`tab ${paymentMethod === "card" ? "active" : ""}`}
                onClick={() => setPaymentMethod("card")}
              >
                💳 Credit/Debit Card
              </button>
              <button
                className={`tab ${paymentMethod === "upi" ? "active" : ""}`}
                onClick={() => setPaymentMethod("upi")}
              >
                📱 UPI
              </button>
              <button
                className={`tab ${
                  paymentMethod === "netbanking" ? "active" : ""
                }`}
                onClick={() => setPaymentMethod("netbanking")}
              >
                🏦 Net Banking
              </button>
            </div>

            <div className="payment-form">
              {paymentMethod === "card" && (
                <div className="card-form">
                  <div className="form-group">
                    <label>Card Number</label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      defaultValue="4111 1111 1111 1111"
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Expiry Date</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        defaultValue="12/28"
                      />
                    </div>
                    <div className="form-group">
                      <label>CVV</label>
                      <input type="text" placeholder="123" defaultValue="123" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Cardholder Name</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      defaultValue="Test User"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === "upi" && (
                <div className="upi-form">
                  <div className="form-group">
                    <label>UPI ID</label>
                    <input
                      type="text"
                      placeholder="username@paytm"
                      defaultValue="test@paytm"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === "netbanking" && (
                <div className="netbanking-form">
                  <div className="form-group">
                    <label>Select Bank</label>
                    <select defaultValue="hdfc">
                      <option value="hdfc">HDFC Bank</option>
                      <option value="icici">ICICI Bank</option>
                      <option value="sbi">State Bank of India</option>
                      <option value="axis">Axis Bank</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="payment-actions">
            <button
              className="btn btn-secondary"
              onClick={onBack}
              disabled={processing}
            >
              Back to Seat Selection
            </button>

            <button
              className="btn btn-primary pay-button"
              onClick={handlePayment}
              disabled={processing}
            >
              {processing ? (
                <>
                  <div className="spinner small" />
                  Processing Payment...
                </>
              ) : (
                `Pay ₹${parseFloat(booking.total_amount).toLocaleString()}`
              )}
            </button>
          </div>

          <div className="security-info">
            <span>🔒 Your payment information is secure and encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
