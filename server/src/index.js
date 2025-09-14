// server/src/index.js
//
// Drop-in entrypoint that preserves your existing API,
// adds a health check, and conditionally enables the one-time
// admin bootstrap route (see server/src/bootstrapRoute.js).
//
// It does NOT change your auth logic or DB models.

const express = require('express');
const cors = require('cors');

const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json());

// Mount your existing API if you have an app/router module.
// These are optional best-effort mounts that won’t crash if missing.
try {
  // If your project exposes an Express app from ./app, mount it.
  // eslint-disable-next-line global-require
  const existingApp = require('./app');
  if (typeof existingApp === 'function') {
    app.use(existingApp);
    console.log('[index] Mounted ./app');
  }
} catch (_) {
  // no-op
}
try {
  // If you keep routes under ./routes and export a router, mount under /api
  // eslint-disable-next-line global-require
  const existingRoutes = require('./routes');
  if (typeof existingRoutes === 'function') {
    app.use('/api', existingRoutes());
    console.log('[index] Mounted ./routes() under /api');
  } else if (existingRoutes && typeof existingRoutes === 'object' && typeof existingRoutes.use === 'function') {
    app.use('/api', existingRoutes);
    console.log('[index] Mounted ./routes under /api');
  }
} catch (_) {
  // no-op
}

// One-time bootstrap endpoint (enabled only when ENABLE_BOOTSTRAP=1)
try {
  // eslint-disable-next-line global-require
  require('./bootstrapRoute')(app);
  console.log('[index] Bootstrap route evaluated');
} catch (e) {
  console.log('[index] Bootstrap route not mounted:', e?.message || e);
}

// Simple health check that never interferes with your auth
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server on :${PORT}`);
});

module.exports = app;
