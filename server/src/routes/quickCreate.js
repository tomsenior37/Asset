import express from 'express';
import { z } from 'zod';
import Client from '../models/Client.js';
import Location from '../models/Location.js';
import Asset from '../models/Asset.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const QuickAsset = z.object({
  client: z.string().min(1),
  location: z.string().min(1),
  name: z.string().min(1),
  tag: z.string().optional().default(''),
  category: z.string().optional().default(''),
  model: z.string().optional().default(''),
  serial: z.string().optional().default(''),
  notes: z.string().optional().default('')
});

router.post('/quick/assets', requireAuth, async (req, res) => {
  const body = QuickAsset.parse(req.body);
  const [c, l] = await Promise.all([
    Client.findById(body.client).lean(),
    Location.findById(body.location).lean()
  ]);
  if (!c) return res.status(400).json({ error: 'Invalid client' });
  if (!l) return res.status(400).json({ error: 'Invalid location' });

  const made = await Asset.create(body);
  res.status(201).json(made);
});

export default router;
