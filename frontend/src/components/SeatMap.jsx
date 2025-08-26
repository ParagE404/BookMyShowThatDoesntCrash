// Update frontend/src/components/SeatMap.jsx - Add error handling
import React from 'react';
import './SeatMap.css';

export default function SeatMap({ seats, selectedSeats, onSeatSelect }) {
  // Defensive check - make sure seats is an array
  if (!seats || !Array.isArray(seats)) {
    return (
      <div className="seat-map">
        <div className="no-seats-message">
          <p>No seats available at the moment.</p>
          <button className="btn btn-secondary" onClick={() => window.location.reload()}>
            Refresh
          </button>
        </div>
      </div>
    );
  }

  if (seats.length === 0) {
    return (
      <div className="seat-map">
        <div className="no-seats-message">
          <p>All seats are currently booked or unavailable.</p>
          <button className="btn btn-secondary" onClick={() => window.location.reload()}>
            Check Again
          </button>
        </div>
      </div>
    );
  }

  // Group seats by category and section
  const groupedSeats = seats.reduce((groups, seat) => {
    const key = `${seat.category_name}-${seat.section}`;
    if (!groups[key]) {
      groups[key] = {
        category: seat.category_name,
        section: seat.section,
        price: seat.price,
        seats: []
      };
    }
    groups[key].seats.push(seat);
    return groups;
  }, {});

  const getSeatStatus = (seat) => {
    if (selectedSeats && selectedSeats.find(s => s.id === seat.id)) return 'selected';
    if (seat.status === 'sold') return 'booked';
    if (seat.status === 'locked') return 'locked';
    return 'available';
  };

  const getSeatColor = (category) => {
    switch (category.toLowerCase()) {
      case 'silver': return '#10B981'; // Green
      case 'gold': return '#F59E0B';   // Orange  
      case 'platinum': return '#8B5CF6'; // Purple
      default: return '#6B7280';       // Gray
    }
  };

  return (
    <div className="seat-map">
      {/* Stage */}
      <div className="stage">
        <div className="stage-label">🎤 STAGE</div>
      </div>

      {/* Seat Categories */}
      <div className="seat-categories">
        {Object.values(groupedSeats).map(group => (
          <div key={`${group.category}-${group.section}`} className="seat-category">
            <div className="category-header">
              <h4 style={{ color: getSeatColor(group.category) }}>
                {group.category} - Section {group.section}
              </h4>
              <span className="category-price">₹{group.price}</span>
            </div>

            <div className="seats-grid">
              {group.seats
                .sort((a, b) => {
                  if (a.row_number !== b.row_number) {
                    return parseInt(a.row_number) - parseInt(b.row_number);
                  }
                  return a.seat_number.localeCompare(b.seat_number);
                })
                .map(seat => (
                  <button
                    key={seat.id}
                    className={`seat ${getSeatStatus(seat)}`}
                    onClick={() => getSeatStatus(seat) === 'available' || getSeatStatus(seat) === 'selected' 
                      ? onSeatSelect(seat) : null}
                    disabled={seat.status === 'sold' || seat.status === 'locked'}
                    title={`${seat.category_name} - ${seat.seat_number} - ₹${seat.price}`}
                    style={{
                      '--seat-color': getSeatColor(group.category)
                    }}
                  >
                    {seat.seat_number.split('-').pop()}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="seat-legend">
        <div className="legend-item">
          <div className="legend-seat available"></div>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <div className="legend-seat selected"></div>
          <span>Selected</span>
        </div>
        <div className="legend-item">
          <div className="legend-seat locked"></div>
          <span>In Process</span>
        </div>
        <div className="legend-item">
          <div className="legend-seat booked"></div>
          <span>Booked</span>
        </div>
      </div>
    </div>
  );
}
