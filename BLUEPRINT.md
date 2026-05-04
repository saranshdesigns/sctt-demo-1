# SCTT Bus Booking Chatbot — BLUEPRINT

WhatsApp-style bus booking chatbot demo. Single Express server on port 3000 serves the React build, REST endpoints, and Socket.IO. Bookings live in an in-memory array (no DB).

---

## 1. File Structure

```
sctt-chatbot-demo/
├── BLUEPRINT.md                ← this file
├── README.md                   ← how to run
├── package.json                ← root: express, socket.io, cors, nanoid, concurrently
│
├── server/
│   ├── index.js                ← Express + Socket.IO + static + catch-all + REST
│   └── bookings.js             ← in-memory store + addBooking(), getAll(), metrics()
│
└── client/
    ├── index.html
    ├── vite.config.js          ← proxy /socket.io + /api to :3000 in dev
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── package.json            ← react, react-router-dom, socket.io-client
    └── src/
        ├── main.jsx            ← mounts App with BrowserRouter
        ├── App.jsx             ← routes: "/" → ChatPage, "/dashboard" → DashboardPage
        ├── index.css           ← Tailwind directives + doodle bg pattern + keyframes
        │
        ├── pages/
        │   ├── ChatPage.jsx        ← wraps ChatWindow in PhoneFrame on desktop
        │   └── DashboardPage.jsx   ← metric cards + live bookings table
        │
        ├── components/
        │   ├── PhoneFrame.jsx      ← 380px dark-bezel phone mockup (desktop only)
        │   ├── ChatWindow.jsx      ← header + scrollable messages + input
        │   ├── MessageBubble.jsx   ← user (green) / bot (white) bubbles + ticks
        │   ├── QuickReplies.jsx    ← rounded pill buttons below bot messages
        │   ├── TypingIndicator.jsx ← 3 animated dots inside a bot bubble
        │   └── PaymentModal.jsx    ← spinner → success overlay
        │
        └── utils/
            ├── botLogic.js         ← conversation state machine
            └── socket.js           ← io(window.location.origin) singleton
```

---

## 2. Conversation State Machine (botLogic.js)

Each user action produces the next bot step. State is held in `ChatPage` via `useState({ step, destination, date, slot, boarding, fare, busType })`.

| Step # | State name        | Bot message                                                                 | User input type          |
|--------|-------------------|------------------------------------------------------------------------------|--------------------------|
| 0      | `GREETING`        | "Namaste! 🙏 SCTT Bus Booking mein aapka swagat hai. Kahan jaana hai aapko?" | free text (destination)  |
| 1      | `ASK_DATE`        | "Mumbai se [Dest] ✓ — Kab jaana hai?"                                        | [Aaj] [Kal] [Custom]     |
| 2      | `SHOW_SLOTS`      | "Ye rahe available slots:" + 4 slot cards                                    | tap a slot card          |
| 3      | `ASK_BOARDING`    | "Boarding point kahan se chahiye?"                                           | [Dadar][Borivali][Andheri][Thane] |
| 4      | `SHOW_SUMMARY`    | Booking summary card + "💳 Pay ₹XXXX" button                                 | tap Pay                  |
| 5      | `PAYMENT`         | Modal: spinner 2s → ✅ Payment Successful                                    | auto-close               |
| 6      | `CONFIRMED`       | "Shukriya! ✅ Booking ID: SCTT-XXXXX. Safe journey! 🚌"                      | end                      |

**Destination keyword extraction:** regex scan user text for `gujarat|bangalore|delhi|lucknow|bhopal|pune|ahmedabad|goa|jaipur|hyderabad` (case-insensitive). If no match, echo user's own words as destination.

**Slot generation:** 4 random slots built from arrays — times `[06:00, 08:00, 14:00, 20:00, 22:30]`, bus types `[AC Sleeper, Non-AC Seater, Volvo Multi-Axle, AC Semi-Sleeper]`, fare `800 + Math.floor(Math.random()*700)`, duration `10 + Math.floor(Math.random()*6) + 'h'`.

**Timing:** every bot message is preceded by `TypingIndicator` for `800 + Math.random()*400` ms.

---

## 3. Socket.IO Events

Server creates Socket.IO on the same HTTP server.

| Event          | Direction          | Payload                                                      | Emitted by      |
|----------------|--------------------|--------------------------------------------------------------|-----------------|
| `connection`   | client → server    | —                                                            | Socket.IO       |
| `new-booking`  | server → all clients | `{ id, customer, route, date, time, boarding, fare, busType, status, createdAt }` | server after POST /api/book |
| `bookings-snapshot` | server → client (on connect) | `Booking[]`                                          | server on `connection` |

**REST endpoint:** `POST /api/book` — body is the booking draft, server adds `id` via `nanoid(5)`, pushes to array, broadcasts `new-booking`, returns the booking.

`GET /api/bookings` — returns all bookings (fallback for dashboard hydration).

---

## 4. Dashboard (/dashboard)

- **Metric cards (top row, 3 cards):**
  - Total Bookings (count)
  - Total Revenue (sum of fare, formatted ₹)
  - Today's Bookings (count where `createdAt` is today)
- **Bookings table:** Booking ID · Customer · Route · Date · Time · Boarding · Fare · Status
- **Flash animation:** on `new-booking` event the new row gets `bg-green-100` for 2000ms then fades.
- **Hydration:** on mount, fetch `GET /api/bookings` + listen for `bookings-snapshot` on socket.
- **Responsive:** table becomes stacked cards on `<640px`.

---

## 5. WhatsApp UI Details

- Header bar: `bg-[#075E54]`, height 56px, avatar circle, title "SCTT Bookings", subtitle "online".
- Chat background: `bg-[#ECE5DD]` + doodle SVG via CSS `background-image: url("data:image/svg+xml;...")`.
- User bubble: right aligned, `bg-[#DCF8C6]`, `rounded-lg rounded-tr-none`, timestamp + ✓✓ in blue.
- Bot bubble: left aligned, `bg-white`, `rounded-lg rounded-tl-none`, timestamp in gray.
- Typing indicator: `<span>` dots with staggered `@keyframes bounce` animation.
- Quick replies: flex-wrap row of `rounded-full border border-green-600 text-green-700 px-4 py-1`.
- PhoneFrame: only renders on `md:` breakpoint — 380px wide, 780px tall, `rounded-[40px]`, `bg-neutral-900` bezel, inner content `rounded-[32px] overflow-hidden`.

---

## 6. Production Build & Serving

- Root `npm run build` → `cd client && npm install && npm run build` produces `client/dist/`.
- `server/index.js`:
  - `app.use(cors({ origin: "*", credentials: true }))`
  - `app.use(express.json())`
  - `app.use(express.static(path.join(__dirname, "../client/dist")))`
  - REST routes under `/api/*`
  - `app.get("*", (_, res) => res.sendFile(".../client/dist/index.html"))` (catch-all for React Router)
  - Socket.IO with `cors: { origin: "*" }`
  - `server.listen(process.env.PORT || 3000, "0.0.0.0")`
- Client uses `io(window.location.origin)` — never hardcodes localhost, so ngrok works unchanged.

---

## 7. Scripts (root package.json)

```json
{
  "scripts": {
    "server": "node server/index.js",
    "dev": "concurrently \"npm run server\" \"cd client && npm run dev\"",
    "build": "cd client && npm install && npm run build",
    "start": "node server/index.js",
    "demo": "npm run build && npm start"
  }
}
```

---

## 8. Verification Checklist (after build)

1. `npm run build` completes with no errors.
2. `npm start` prints "✅ SCTT DEMO IS LIVE" and listens on :3000.
3. `curl http://localhost:3000` returns HTML with `<div id="root">`.
4. `curl http://localhost:3000/api/bookings` returns `[]`.
5. Browser: `/` renders WhatsApp chat; `/dashboard` renders operator view.
6. Complete booking on `/` → row appears instantly on `/dashboard`.

---

**Say "go ahead" to start scaffolding.**
