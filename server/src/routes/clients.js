import express from 'express';
import { z } from 'zod';
import Client from '../models/Client.js';
import Location from '../models/Location.js';
import Asset from '../models/Asset.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

const clientSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  notes: z.string().optional().default(''),

  addressLine1: z.string().optional().default(''),
  addressLine2: z.string().optional().default(''),
  city: z.string().optional().default(''),
  state: z.string().optional().default(''),
  postcode: z.string().optional().default(''),
  country: z.string().optional().default(''),

  contactName: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  website: z.string().optional().default(''),
});

router.get('/', async (_req, res) => {
  const items = await Client.find().sort({ name: 1 }).lean();
  res.json(items);
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const data = clientSchema.parse(req.body);
  const made = await Client.create(data);
  res.status(201).json(made);
});

router.get('/:id', async (req, res) => {
  const item = await Client.findById(req.params.id).lean();
  if (!item) return res.status(404).json({ error: 'Client not found' });
  res.json(item);
});

router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const data = clientSchema.partial().parse(req.body);
  const item = await Client.findByIdAndUpdate(req.params.id, data, { new: true });
  if (!item) return res.status(404).json({ error: 'Client not found' });
  res.json(item);
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const clientId = req.params.id;
  const locCount = await Location.countDocuments({ client: clientId });
  const assetCount = await Asset.countDocuments({ client: clientId });
  if (locCount || assetCount) {
    return res.status(400).json({ error: 'Client has locations/assets; delete or reassign them first.' });
  }
  const out = await Client.findByIdAndDelete(clientId);
  if (!out) return res.status(404).json({ error: 'Client not found' });
  res.json({ ok: true });
});

export default router;
