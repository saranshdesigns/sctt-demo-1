# SCTT Bus Booking Chatbot Demo

A WhatsApp-style bus booking chatbot demo with a live operator dashboard. A single Express server hosts the React build, REST endpoints, and Socket.IO on port 3000. Bookings live in memory — no database.

## Run it

```
npm run build
npm start
```

Then open:
- http://localhost:3000 — WhatsApp-style chat
- http://localhost:3000/dashboard — operator dashboard

## Dev mode

```
npm run dev
```

Runs the Express server and the Vite dev server concurrently. Vite proxies `/api` and `/socket.io` to `:3000`.

## Expose via ngrok

```
ngrok http 3000
```

The client connects via `io(window.location.origin)`, so the public ngrok URL works without any config changes.

## Tech

- React 18 + Vite
- Tailwind CSS
- React Router
- Socket.IO (client + server)
- Express
- In-memory booking store (no DB)

## Flow

1. User opens `/`, greeted by the bot in a WhatsApp-style phone frame.
2. Bot asks for destination → date → slot → boarding point.
3. User taps "Pay ₹XXXX"; a modal spins for 2s then confirms payment.
4. Server assigns a `SCTT-XXXXX` id, stores the booking, broadcasts `new-booking` over Socket.IO.
5. Any open `/dashboard` instantly receives the booking; the new row flashes green for 2s.
