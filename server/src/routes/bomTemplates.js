import express from 'express';
import { z } from 'zod';
import BomTemplate from '../models/BomTemplate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

const lineSchema = z.object({
  part: z.string().optional().nullable(),
  partName: z.string().optional().default(''),
  partNo: z.string().optional().default(''),
  qty: z.coerce.number().min(0).default(1),
  unit: z.string().optional().default('ea'),
  notes: z.string().optional().default('')
});

const tmplSchema = z.object({
  name: z.string().min(1),
  client: z.string().optional().nullable(),
  category: z.string().optional().default(''),
  lines: z.array(lineSchema).optional().default([])
});

router.get('/', async (req, res) => {
  const q = req.query.q ? String(req.query.q) : '';
  const client = req.query.client || null;
  const filter = {};
  if (q) filter.$text = { $search: q };
  if (client === 'null' || client === '' || client === null) {
    // return both global and client-specific (no filter)
  } else if (client) {
    filter.$or = [{ client }, { client: null }];
  }
  const items = await BomTemplate.find(filter).sort({ updatedAt: -1 }).lean();
  res.json(items);
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const data = tmplSchema.parse(req.body);
  const made = await BomTemplate.create(data);
  res.status(201).json(made);
});

router.get('/:id', async (req, res) => {
  const item = await BomTemplate.findById(req.params.id).lean();
  if (!item) return res.status(404).json({ error: 'Template not found' });
  res.json(item);
});

router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const data = tmplSchema.partial().parse(req.body);
  const item = await BomTemplate.findByIdAndUpdate(req.params.id, data, { new: true });
  if (!item) return res.status(404).json({ error: 'Template not found' });
  res.json(item);
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const out = await BomTemplate.findByIdAndDelete(req.params.id);
  if (!out) return res.status(404).json({ error: 'Template not found' });
  res.json({ ok: true });
});

export default router;
