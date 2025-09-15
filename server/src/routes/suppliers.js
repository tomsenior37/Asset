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

/** List parts referencing (linked=true) or not referencing (linked=false) this supplier */
router.get('/:id/parts', async (req, res) => {
  const supplierId = req.params.id;
  const linked = (req.query.linked ?? 'true') === 'true';

  if (linked) {
    const parts = await Part.find({ 'supplierOptions.supplier': supplierId })
      .select('internalSku name category unit supplierOptions')
      .sort({ name: 1 })
      .lean();
    return res.json(parts);
  } else {
    const parts = await Part.find({
      $or: [
        { supplierOptions: { $exists: false } },
        { supplierOptions: { $size: 0 } },
        { supplierOptions: { $not: { $elemMatch: { supplier: supplierId } } } }
      ]
    })
      .select('internalSku name category unit supplierOptions')
      .sort({ name: 1 })
      .lean();
    return res.json(parts);
  }
});

/** Link this supplier to a part (adds/updates supplierOptions element) */
router.post('/:id/link-part', requireAuth, requireRole('admin'), async (req, res) => {
  const supplierId = req.params.id;
  const body = z.object({
    partId: z.string().min(1),
    supplierSku: z.string().optional().default(''),
    price: z.coerce.number().optional().default(0),
    currency: z.string().optional().default('USD'),
    leadTimeDays: z.coerce.number().optional().default(0),
    moq: z.coerce.number().optional().default(1),
    preferred: z.boolean().optional().default(false)
  }).parse(req.body);

  const part = await Part.findById(body.partId);
  if (!part) return res.status(404).json({ error: 'Part not found' });

  const idx = (part.supplierOptions || []).findIndex(o => String(o.supplier) === String(supplierId));
  const payload = {
    supplier: supplierId,
    supplierSku: body.supplierSku,
    price: body.price,
    currency: body.currency,
    leadTimeDays: body.leadTimeDays,
    moq: body.moq,
    preferred: body.preferred
  };
  if (idx >= 0) part.supplierOptions[idx] = payload;
  else part.supplierOptions.push(payload);

  await part.save();
  res.json(part);
});

/** Unlink this supplier from a part (removes supplierOptions element) */
router.delete('/:id/link-part/:partId', requireAuth, requireRole('admin'), async (req, res) => {
  const supplierId = req.params.id;
  const partId = req.params.partId;
  const out = await Part.findByIdAndUpdate(
    partId,
    { $pull: { supplierOptions: { supplier: supplierId } } },
    { new: true }
  );
  if (!out) return res.status(404).json({ error: 'Part not found' });
  res.json(out);
});

export default router;
