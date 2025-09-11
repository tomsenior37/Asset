import 'dotenv/config.js';
import path from 'path';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';

import { authOptional } from './middleware/auth.js';

import clientsRouter from './routes/clients.js';
import locationsRouter from './routes/locations.js';
import assetsRouter from './routes/assets.js';
import partsRouter from './routes/parts.js';
import suppliersRouter from './routes/suppliers.js';
import authRouter from './routes/auth.js';
import jobsRouter from './routes/jobs.js';
// add near other imports
import quickCreateRouter from './routes/quickCreate.js';

// after other app.use(...) lines:


const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/assetdb';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN }));
app.use(express.json({ limit: '8mb' }));
app.use(morgan('dev'));
app.use(authOptional);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/clients', clientsRouter);
app.use('/api', locationsRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/parts', partsRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api', jobsRouter);

app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use('/api', quickCreateRouter);
mongoose.connect(MONGO_URI, { autoIndex: true }).then(() => {
  console.log('Mongo connected');
  app.listen(PORT, () => console.log(`Server on :${PORT}`));
}).catch((e) => {
  console.error('Mongo connection error:', e.message);
  process.exit(1);
});
