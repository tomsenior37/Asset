// server/src/index.js  (ESM)
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';

import authOptional from './middleware/auth.js';

// Your route modules (present in this repo snapshot)
import authRouter from './routes/auth.js';
import clientsRouter from './routes/clients.js';
import locationsRouter from './routes/locations.js';
import assetsRouter from './routes/assets.js';
import partsRouter from './routes/parts.js';
import suppliersRouter from './routes/suppliers.js';
import bomTemplatesRouter from './routes/bomTemplates.js';

const PORT = Number(process.env.PORT || process.env.API_PORT || 4000);
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/assetdb';
const CORS_ORIGIN = (process.env.CORS_ORIGIN || '*').trim();

const app = express();

// CORS: '*' => allow all; otherwise support CSV of origins
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

// Health first — always available, even before DB connects
let dbState = 'connecting'; // 'connecting' | 'connected' | 'error'
app.get('/api/health', (_req, res) =>
  res.json({ ok: true, db: dbState })
);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/clients', clientsRouter);
app.use('/api', locationsRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/parts', partsRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/bom-templates', bomTemplatesRouter);

// Static uploads (if used)
import path from 'path';
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// 404 JSON
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Start server immediately; connect to Mongo in background
const server = app.listen(PORT, () => {
  console.log(`Server on :${PORT}`);
});

// Background Mongo connect with status tracking
mongoose
  .connect(MONGO_URI, { autoIndex: true })
  .then(() => {
    dbState = 'connected';
    console.log('Mongo connected');
  })
  .catch((e) => {
    dbState = 'error';
    console.error('Mongo connection error:', e.message);
    // keep serving health & static/error routes so deploy stays reachable
  });

// Optional: graceful shutdown
process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
