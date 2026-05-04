const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const { addBooking, getAll, getMetrics } = require('./bookings');
const { hasKey, detectLanguage, localize } = require('./ai');

const app = express();

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Serve the built React client.
app.use(express.static(path.join(__dirname, '../client/dist')));

// ---------- REST API ----------
app.get('/api/bookings', (_req, res) => {
  res.json(getAll());
});

app.get('/api/metrics', (_req, res) => {
  res.json(getMetrics());
});

app.post('/api/book', (req, res) => {
  const booking = addBooking(req.body);
  io.emit('new-booking', booking);
  res.json(booking);
});

app.get('/api/ai/status', (_req, res) => res.json({ enabled: hasKey() }));

app.post('/api/ai/detect-language', async (req, res) => {
  const { text } = req.body || {};
  res.json(await detectLanguage(text || ''));
});

app.post('/api/ai/localize', async (req, res) => {
  const { text, targetLanguage } = req.body || {};
  res.json(await localize(text || '', targetLanguage || 'hinglish'));
});

// ---------- HTTP + Socket.IO ----------
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

io.on('connection', (socket) => {
  // Hydrate the newly connected dashboard/client with the current list.
  socket.emit('bookings-snapshot', getAll());
});

// React Router catch-all — must come AFTER /api routes and must not
// swallow /api or /socket.io requests. Express 5 uses path-to-regexp v6,
// which no longer accepts a bare "*" pattern, so use a real RegExp.
app.get(/^\/(?!api|socket\.io).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  const base = `http://localhost:${PORT}`;
  console.log('========================================');
  console.log('✅ SCTT DEMO IS LIVE');
  console.log('========================================');
  console.log(`Chat (customer view): ${base}`);
  console.log(`Dashboard (operator): ${base}/dashboard`);
  console.log('');
  console.log('Next steps:');
  console.log('1. Open both URLs in your browser to test');
  console.log('2. Do a full booking from the chat');
  console.log('3. Watch it appear on the dashboard');
  console.log(`4. When ready for ngrok, run: ngrok http ${PORT}`);
  console.log('========================================');
});
