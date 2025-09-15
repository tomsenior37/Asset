// server/src/index.js  (ESM)
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';

import authOptional from './middleware/auth.js';

// Route modules (present in repo)
import authRouter from './routes/auth.js';
import clientsRouter from './routes/clients.js';
import locationsRouter from './routes/locations.js';
import assetsRouter from './routes/assets.js';
import partsRouter from './routes/parts.js';
import suppliersRouter from './routes/suppliers.js';
import bomTemplatesRouter from './routes/bomTemplates.js';

import path from 'path';

const PORT = Number(process.env.PORT || process.env.API_PORT || 4000);
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/assetdb';
const CORS_ORIGIN = (process.env.CORS_ORIGIN || '*').trim();

const app = express();

// CORS: "*" allows all; otherwise support CSV of origins
const corsOption =
  CORS_ORIGIN === '*'
    ? { origin: true }
    : {
        origin: (origin, cb) => {
          const allowed = CORS_ORIGIN.split(',').map((s) => s.trim());
          if (!origin || allowed.includes(origin)) return cb(null, true);
          return cb(new Error('Not allowed by CORS'));
        },
      };

app.use(cors(corsOption));
app.use(express.json({ limit: '8mb' }));
app.use(morgan('dev'));
app.use(authOptional);

// Health is always available (reports DB state)
let dbState = 'connecting'; // 'connecting' | 'connected' | 'error'
app.get('/api/health', (_req, res) => res.json({ ok: true, db: dbState }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/clients', clientsRouter);
app.use('/api', locationsRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/parts', partsRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/bom-templates', bomTemplatesRouter);

// Static uploads
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// 404 JSON
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Start HTTP server immediately
const server = app.listen(PORT, () => {
  console.log(`Server on :${PORT}`);
});

// Connect to Mongo in background; never exit process on failure
mongoose
  .connect(MONGO_URI, { autoIndex: true })
  .then(() => {
    dbState = 'connected';
    console.log('Mongo connected');
  })
  .catch((e) => {
    dbState = 'error';
    console.error('Mongo connection error:', e.message);
    // keep serving health and static/error routes
  });

// Graceful shutdown
process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT',  () => server.close(() => process.exit(0)));
