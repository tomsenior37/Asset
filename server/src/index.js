// server/src/index.js
const express = require('express');
const cors = require('cors');

const PORT = process.env.PORT || 4000;
const app = express();

app.use(cors());
app.use(express.json());

// Auth routes (CJS)
app.use('/api', require('./authRoutes'));

// Best-effort mount of any existing routes/app (won’t crash if absent)
try {
  const routes = require('./routes');
  if (typeof routes === 'function') app.use('/api', routes());
  else if (routes && typeof routes.use === 'function') app.use('/api', routes);
} catch {}
try {
  const existingApp = require('./app');
  if (typeof existingApp === 'function') app.use(existingApp);
} catch {}

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Bind to 0.0.0.0 so the published port works
app.listen(PORT, '0.0.0.0', () => console.log(`Server on :${PORT}`));

module.exports = app;
