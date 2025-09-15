import express from 'express';
import { z } from 'zod';
import Part from '../models/Part.js';
import Supplier from '../models/Supplier.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { paginateParams } from '../utils/paginate.js';

const router = express.Router();

const supplierOpt = z.object({
  supplier: z.string().min(1),
  supplierSku: z.string().optional().default(''),
  price: z.coerce.number().optional().default(0),
  currency: z.string().optional().default('USD'),
  leadTimeDays: z.coerce.number().optional().default(0),
  moq: z.coerce.number().optional().default(1),
  preferred: z.boolean().optional().default(false)
});

const partSchema = z.object({
  name: z.string().min(1),
  internalSku: z.string().min(1),
  category: z.string().optional().default(''),
  unit: z.string().optional().default(''),
  specs: z.record(z.any()).optional().default({}),
  notes: z.string().optional().default(''),

  supplierOptions: z.array(supplierOpt).optional().default([]),

  internal: z.object({
    onHand: z.coerce.number().min(0).optional().default(0),
    standardCost: z.coerce.number().optional().default(0),
    reorderPoint: z.coerce.number().optional().default(0),
    reorderQty: z.coerce.number().optional().default(0)
  }).optional().default({})
});

router.get('/', async (req, res) => {
  const { page, limit, skip } = paginateParams(req);
  const q = req.query.q ? String(req.query.q) : '';
  const filter = q ? { $text: { $search: q } } : {};
  const [items, total] = await Promise.all([
    Part.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Part.countDocuments(filter)
  ]);
  res.json({ items, total, page, pages: Math.ceil(total/limit) });
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const data = partSchema.parse(req.body);

  // validate supplier IDs only (no site validation anymore)
  const supplierIds = data.supplierOptions.map(s => s.supplier);
  if (supplierIds.length) {
    const count = await Supplier.countDocuments({ _id: { $in: supplierIds } });
    if (count !== supplierIds.length) return res.status(400).json({ error: 'Invalid supplier in supplierOptions' });
  }

  const made = await Part.create(data);
  res.status(201).json(made);
});

router.get('/:id', async (req, res) => {
  const item = await Part.findById(req.params.id).lean();
  if (!item) return res.status(404).json({ error: 'Part not found' });
  res.json(item);
});

router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const data = partSchema.partial().parse(req.body);

  // validate new supplier IDs if present
  if (data.supplierOptions) {
    const supplierIds = data.supplierOptions.map(s => s.supplier);
    if (supplierIds.length) {
      const count = await Supplier.countDocuments({ _id: { $in: supplierIds } });
      if (count !== supplierIds.length) return res.status(400).json({ error: 'Invalid supplier in supplierOptions' });
    }
  }

  const item = await Part.findByIdAndUpdate(req.params.id, data, { new: true });
  if (!item) return res.status(404).json({ error: 'Part not found' });
  res.json(item);
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const out = await Part.findByIdAndDelete(req.params.id);
  if (!out) return res.status(404).json({ error: 'Part not found' });
  res.json({ ok: true });
});

export default router;
