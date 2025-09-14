// server/src/index.js
import express from 'express';
import cors from 'cors';
import authRoutes from './authRoutes.js';

const PORT = process.env.PORT || 4000;
const app = express();

app.use(cors());
app.use(express.json());

// Auth routes
app.use('/api', authRoutes);

// Best-effort mount of any existing routes/app (won’t crash if absent)
try {
  const mod = await import('./routes.js');
  const routes = mod.default ?? mod;
  if (typeof routes === 'function') app.use('/api', routes());
  else if (routes && typeof routes.use === 'function') app.use('/api', routes);
} catch {}
try {
  const mod = await import('./app.js');
  const existingApp = mod.default ?? mod;
  if (typeof existingApp === 'function') app.use(existingApp);
} catch {}

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Bind to 0.0.0.0 so published port works
app.listen(PORT, '0.0.0.0', () => console.log(`Server on :${PORT}`));

export default app;
