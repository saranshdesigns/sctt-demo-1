// In-memory booking store for the SCTT demo.
// nanoid v5 is ESM-only, so we use a tiny random-ID fallback to stay CommonJS.

const bookings = [];

function generateId() {
  return 'SCTT-' + Math.random().toString(36).slice(2, 7).toUpperCase();
}

function addBooking(draft) {
  const booking = {
    id: generateId(),
    customer: draft.customer,
    route: draft.route,
    date: draft.date,
    time: draft.time,
    boarding: draft.boarding,
    fare: draft.fare,
    perSeat: draft.perSeat,
    passengers: draft.passengers || 1,
    busType: draft.busType,
    status: 'Confirmed',
    createdAt: new Date().toISOString(),
  };
  bookings.push(booking);
  return booking;
}

function getAll() {
  // Newest first — return a copy so callers can't mutate our store.
  return [...bookings].reverse();
}

function getMetrics() {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();

  let todayCount = 0;
  let revenue = 0;
  for (const b of bookings) {
    const c = new Date(b.createdAt);
    if (c.getFullYear() === y && c.getMonth() === m && c.getDate() === d) {
      todayCount += 1;
    }
    revenue += Number(b.fare) || 0;
  }

  return {
    total: bookings.length,
    revenue,
    today: todayCount,
  };
}

module.exports = { addBooking, getAll, getMetrics };
