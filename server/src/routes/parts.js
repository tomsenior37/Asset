import express from 'express';
import { z } from 'zod';
import { parse as csvParse } from 'csv-parse';
import { stringify as csvStringify } from 'csv-stringify';
import Part from '../models/Part.js';
import Supplier from '../models/Supplier.js';
import Location from '../models/Location.js';
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
    standardCost: z.coerce.number().optional().default(0),
    reorderPoint: z.coerce.number().optional().default(0),
    reorderQty: z.coerce.number().optional().default(0),
    stockBySite: z.array(z.object({
      site: z.string().min(1),
      qty: z.coerce.number().min(0).default(0)
    })).optional().default([])
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
  const supplierIds = data.supplierOptions.map(s => s.supplier);
  const siteIds = (data.internal?.stockBySite || []).map(s => s.site);
  const [suppliers, sites] = await Promise.all([
    Supplier.find({ _id: { $in: supplierIds }}).lean(),
    Location.find({ _id: { $in: siteIds }, kind: 'site' }).lean()
  ]);
  if (suppliers.length !== supplierIds.length) return res.status(400).json({ error: 'Invalid supplier in supplierOptions' });
  if (sites.length !== siteIds.length) return res.status(400).json({ error: 'Invalid site in internal.stockBySite' });

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
  const item = await Part.findByIdAndUpdate(req.params.id, data, { new: true });
  if (!item) return res.status(404).json({ error: 'Part not found' });
  res.json(item);
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const out = await Part.findByIdAndDelete(req.params.id);
  if (!out) return res.status(404).json({ error: 'Part not found' });
  res.json({ ok: true });
});

router.post('/import', requireAuth, requireRole('admin'), async (req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', async () => {
    const csv = Buffer.concat(chunks).toString('utf8');
    const records = [];
    csvParse(csv, { columns: true, skip_empty_lines: true, trim: true })
      .on('readable', function() {
        let record; while ((record = this.read())) records.push(record);
      })
      .on('end', async () => {
        const payloads = records.map(r => ({
          internalSku: r.internalSku,
          name: r.name,
          category: r.category || '',
          unit: r.unit || '',
          notes: r.notes || ''
        }));
        const made = await Part.insertMany(payloads, { ordered: false });
        res.json({ inserted: made.length });
      })
      .on('error', (e) => res.status(400).json({ error: e.message }));
  });
});

router.get('/export/csv', async (_req, res) => {
  const items = await Part.find().lean();
  const rows = items.map(p => ({
    internalSku: p.internalSku,
    name: p.name,
    category: p.category,
    unit: p.unit,
    notes: p.notes
  }));
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="parts.csv"');
  csvStringify(rows, { header: true }).pipe(res);
});

export default router;
