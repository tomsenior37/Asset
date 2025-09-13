import 'dotenv/config.js';
import path from 'path';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';

import { authOptional } from './middleware/auth.js';

// Routers that already export default
import clientsRouter from './routes/clients.js';
import locationsRouter from './routes/locations.js';
import assetsRouter from './routes/assets.js';
import partsRouter from './routes/parts.js';
import suppliersRouter from './routes/suppliers.js';
import authRouter from './routes/auth.js';
import jobsRouter from './routes/jobs.js';

// Routers we load defensively (in case of default/named export mismatch)
import * as importsRouterNS from './routes/imports.js';
import * as quickCreateRouterNS from './routes/quickCreate.js';

const importsRouter = importsRouterNS.default ?? importsRouterNS;
const quickCreateRouter = quickCreateRouterNS.default ?? quickCreateRouterNS;

const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/assetdb';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN }));
app.use(express.json({ limit: '16mb' }));
app.use(morgan('dev'));
app.use(authOptional);

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// API
app.use('/api/auth', authRouter);
app.use('/api/clients', clientsRouter);
app.use('/api', locationsRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/parts', partsRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api', jobsRouter);
app.use('/api', importsRouter);
app.use('/api', quickCreateRouter);

// Static uploads
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// 404
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// DB + start
mongoose
  .connect(MONGO_URI, { autoIndex: true })
  .then(() => {
    console.log('Mongo connected');
    app.listen(PORT, () => console.log(`Server on :${PORT}`));
  })
  .catch((e) => {
    console.error('Mongo connection error:', e.message);
    process.exit(1);
  });
