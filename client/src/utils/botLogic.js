// Conversation state machine + helpers for SCTT chatbot.

export const STEPS = {
  GREETING: "GREETING",
  ASK_DESTINATION: "ASK_DESTINATION",
  UNKNOWN_DESTINATION: "UNKNOWN_DESTINATION",
  ASK_DATE: "ASK_DATE",
  ASK_CUSTOM_DATE: "ASK_CUSTOM_DATE",
  SHOW_SLOTS: "SHOW_SLOTS",
  ASK_BOARDING: "ASK_BOARDING",
  ASK_PASSENGERS: "ASK_PASSENGERS",
  SHOW_SUMMARY: "SHOW_SUMMARY",
  PAYMENT: "PAYMENT",
  CONFIRMED: "CONFIRMED",
};

// Cities we actually sell tickets for. Keep these as canonical Title Case.
export const KNOWN_CITIES = [
  "Delhi",
  "Bangalore",
  "Pune",
  "Ahmedabad",
  "Bhopal",
  "Goa",
  "Jaipur",
  "Hyderabad",
  "Lucknow",
  "Gujarat",
];

// The most common ones — surfaced as quick-reply chips on the greeting.
export const POPULAR_DESTINATIONS = ["Delhi", "Pune", "Bhopal", "Ahmedabad", "Goa", "Bangalore"];

const TIMES = ["06:00 AM", "08:00 AM", "02:00 PM", "08:00 PM", "10:30 PM"];
const BUS_TYPES = [
  { name: "AC Sleeper", amenities: ["AC", "Charging", "Water"] },
  { name: "Non-AC Seater", amenities: ["Charging"] },
  { name: "Volvo Multi-Axle", amenities: ["AC", "Charging", "Water", "Blanket"] },
  { name: "AC Semi-Sleeper", amenities: ["AC", "Charging"] },
];

const toTitleCase = (str) =>
  str
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");

// STRICT: returns a known city name if found, else null. Bot will not continue
// with a free-text destination — it must match one of KNOWN_CITIES.
export function extractDestination(text) {
  if (!text) return null;
  const pattern = KNOWN_CITIES.map((c) => c.toLowerCase()).join("|");
  const m = text.match(new RegExp(`\\b(${pattern})\\b`, "i"));
  return m ? toTitleCase(m[1]) : null;
}

const pickUnique = (arr, n) => {
  const pool = [...arr];
  const out = [];
  while (out.length < n && pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
};

export function generateSlots() {
  const chosenTimes = pickUnique(TIMES, 4);
  return chosenTimes.map((time, i) => {
    const bus = BUS_TYPES[Math.floor(Math.random() * BUS_TYPES.length)];
    return {
      id: `slot-${Date.now()}-${i}`,
      time,
      busType: bus.name,
      amenities: bus.amenities,
      fare: 800 + Math.floor(Math.random() * 701),
      duration: `${10 + Math.floor(Math.random() * 6)}h`,
      seatsLeft: 6 + Math.floor(Math.random() * 30),
      rating: (3.8 + Math.random() * 1.2).toFixed(1),
      operator: ["SCTT Express", "SCTT Classic", "SCTT Prime", "SCTT Gold"][i % 4],
    };
  }).map((s, i, arr) => ({
    ...s,
    badge: s.fare === Math.min(...arr.map(x => x.fare)) ? "Cheapest" : s.seatsLeft < 10 ? "Filling Fast" : null,
  }));
}

const MONTH_NAMES = ["january","february","march","april","may","june","july","august","september","october","november","december"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function dateToHint(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return { iso: `${yyyy}-${mm}-${dd}`, label: `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${yyyy}` };
}

export function extractDateHint(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (/\b(aaj|today)\b/i.test(text)) return dateToHint(today);
  if (/\b(kal|tomorrow)\b/i.test(text)) { const d = new Date(today); d.setDate(d.getDate() + 1); return dateToHint(d); }
  if (/\bnext\s+week\b/i.test(text)) { const d = new Date(today); d.setDate(d.getDate() + 7); return dateToHint(d); }

  const nm = lower.match(/\bnext\s+month\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (nm) return dateToHint(new Date(today.getFullYear(), today.getMonth() + 1, parseInt(nm[1], 10)));

  const monthAlt = MONTH_NAMES.join("|");
  const dm = lower.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthAlt})(?:\\s+(\\d{4}))?\\b`));
  if (dm) {
    const day = parseInt(dm[1], 10);
    const month = MONTH_NAMES.indexOf(dm[2]);
    const year = dm[3] ? parseInt(dm[3], 10) : today.getFullYear();
    const d = new Date(year, month, day);
    if (!dm[3] && d < today) d.setFullYear(d.getFullYear() + 1);
    return dateToHint(d);
  }
  const md = lower.match(new RegExp(`\\b(${monthAlt})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+(\\d{4}))?\\b`));
  if (md) {
    const month = MONTH_NAMES.indexOf(md[1]);
    const day = parseInt(md[2], 10);
    const year = md[3] ? parseInt(md[3], 10) : today.getFullYear();
    const d = new Date(year, month, day);
    if (!md[3] && d < today) d.setFullYear(d.getFullYear() + 1);
    return dateToHint(d);
  }
  const numeric = lower.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (numeric) {
    const day = parseInt(numeric[1], 10);
    const month = parseInt(numeric[2], 10) - 1;
    let year = numeric[3] ? parseInt(numeric[3], 10) : today.getFullYear();
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (!numeric[3] && d < today) d.setFullYear(d.getFullYear() + 1);
    return dateToHint(d);
  }
  const bare = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)\b/);
  if (bare) {
    const day = parseInt(bare[1], 10);
    const d = new Date(today.getFullYear(), today.getMonth(), day);
    if (d < today) d.setMonth(d.getMonth() + 1);
    return dateToHint(d);
  }
  return null;
}

export function hintFromQuickChoice(choice) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (choice === "Kal") { const d = new Date(today); d.setDate(d.getDate() + 1); return dateToHint(d); }
  return dateToHint(today);
}

export function botReply(step, ctx = {}) {
  switch (step) {
    case STEPS.GREETING:
      return {
        text: "Namaste! 🙏 SCTT Bus Booking mein aapka swagat hai.\n\nMumbai se kahan jaana hai aapko? Neeche se choose karein ya khud type karein:",
        buttons: POPULAR_DESTINATIONS,
      };
    case STEPS.UNKNOWN_DESTINATION:
      return {
        text: `😅 Sorry — hum abhi sirf in cities ke liye bookings lete hain:\n\n${KNOWN_CITIES.join(", ")}\n\nKahan jaana hai aapko?`,
        buttons: POPULAR_DESTINATIONS,
      };
    case STEPS.ASK_DATE:
      return {
        text: `Mumbai se ${ctx.destination} ✓ — Kab jaana hai?`,
        buttons: ["Aaj", "Kal", "Custom"],
      };
    case STEPS.ASK_CUSTOM_DATE:
      return { text: "Kab jaana hai? Date type karein — jaise '14th May', 'tomorrow', ya '14/05/2026'." };
    case "ASK_CUSTOM_DATE_RETRY":
      return { text: "Date samajh nahi aaya 🤔 — format try karein: '14th May', 'next month 14th', ya '14/05/2026'." };
    case STEPS.SHOW_SLOTS:
      return {
        text: ctx.skippedAskDate
          ? `Mumbai → ${ctx.destination} on ${ctx.dateLabel} ✓ — Ye rahe available buses:`
          : `Date: ${ctx.dateLabel} ✓ — Ye rahe available buses:`,
        slots: ctx.slots || [],
      };
    case STEPS.ASK_BOARDING:
      return {
        text: "Boarding point kahan se chahiye?",
        buttons: ["Dadar", "Borivali", "Andheri", "Thane"],
      };
    case STEPS.ASK_PASSENGERS:
      return {
        text: "Kitne passengers hain?",
        buttons: ["1", "2", "3", "4"],
      };
    case STEPS.SHOW_SUMMARY: {
      const passengers = ctx.passengers || 1;
      const perSeat = ctx.slot?.fare || 0;
      const total = perSeat * passengers;
      return {
        text: "Booking confirm karein:",
        summary: {
          route: `Mumbai → ${ctx.destination}`,
          date: ctx.dateLabel || ctx.date,
          time: ctx.slot?.time,
          busType: ctx.slot?.busType,
          boarding: ctx.boarding,
          passengers,
          perSeat,
          total,
          operator: ctx.slot?.operator,
        },
        payButton: true,
      };
    }
    case STEPS.CONFIRMED:
      return {
        text: "Ticket confirm ho gaya! 🎉",
        ticket: {
          bookingId: ctx.bookingId,
          route: `Mumbai → ${ctx.destination}`,
          date: ctx.dateLabel || ctx.date,
          time: ctx.slot?.time,
          boarding: ctx.boarding,
          passengers: ctx.passengers || 1,
          total: (ctx.slot?.fare || 0) * (ctx.passengers || 1),
          busType: ctx.slot?.busType,
        },
      };
    default:
      return { text: "" };
  }
}

export const TYPING_DELAY = () => 800 + Math.random() * 400;
