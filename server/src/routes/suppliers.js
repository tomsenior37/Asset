import express from 'express';
import { z } from 'zod';
import Supplier from '../models/Supplier.js';
import Part from '../models/Part.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

const schema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  email: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  website: z.string().optional().default(''),
  address: z.string().optional().default(''),
  notes: z.string().optional().default('')
});

router.get('/', async (_req, res) => {
  const items = await Supplier.find().sort({ name: 1 }).lean();
  res.json(items);
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const data = schema.parse(req.body);
  const made = await Supplier.create(data);
  res.status(201).json(made);
});

router.get('/:id', async (req, res) => {
  const item = await Supplier.findById(req.params.id).lean();
  if (!item) return res.status(404).json({ error: 'Supplier not found' });
  res.json(item);
});

router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const data = schema.partial().parse(req.body);
  const item = await Supplier.findByIdAndUpdate(req.params.id, data, { new: true });
  if (!item) return res.status(404).json({ error: 'Supplier not found' });
  res.json(item);
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const out = await Supplier.findByIdAndDelete(req.params.id);
  if (!out) return res.status(404).json({ error: 'Supplier not found' });
  res.json({ ok: true });
});

/** NEW: list parts that reference this supplier in supplierOptions */
router.get('/:id/parts', async (req, res) => {
  const supplierId = req.params.id;
  const parts = await Part.find({ 'supplierOptions.supplier': supplierId })
    .select('internalSku name category unit supplierOptions')
    .sort({ name: 1 })
    .lean();
  res.json(parts);
});

export default router;
