// server/src/index.js
const express = require('express');
const cors = require('cors');

const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json());

// Mount auth routes first (login/register)
const authRoutes = require('./authRoutes');
app.use('/api', authRoutes);

// Mount any existing routes/app if present (best-effort, won’t crash)
try {
  const existingRoutes = require('./routes');
  if (typeof existingRoutes === 'function') {
    app.use('/api', existingRoutes());
    console.log('[index] Mounted ./routes() under /api');
  } else if (existingRoutes && typeof existingRoutes.use === 'function') {
    app.use('/api', existingRoutes);
    console.log('[index] Mounted ./routes under /api');
  }
} catch (_) { /* no-op */ }

try {
  const existingApp = require('./app');
  if (typeof existingApp === 'function') {
    app.use(existingApp);
    console.log('[index] Mounted ./app');
  }
} catch (_) { /* no-op */ }

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server on :${PORT}`);
});

module.exports = app;
