import mongoose from 'mongoose';
import 'dotenv/config.js';
import bcrypt from 'bcryptjs';
import Client from '../src/models/Client.js';
import Location from '../src/models/Location.js';
import Asset from '../src/models/Asset.js';
import User from '../src/models/User.js';
import Supplier from '../src/models/Supplier.js';
import Part from '../src/models/Part.js';
import BomTemplate from '../src/models/BomTemplate.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/assetdb';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Seeding...');

  await Promise.all([
    Client.deleteMany({}), Location.deleteMany({}), Asset.deleteMany({}),
    User.deleteMany({}), Supplier.deleteMany({}), Part.deleteMany({}), BomTemplate.deleteMany({})
  ]);

  await User.create({
    name: 'Admin',
    email: 'admin@example.com',
    passwordHash: await bcrypt.hash('admin123', 10),
    role: 'admin'
  });

  const alcoa = await Client.create({ name: 'Alcoa', code: 'ALCOA' });

  const site = await Location.create({ client: alcoa._id, name: 'Wagerup OC7', code: 'WG-OC7', kind: 'site' });
  const area = await Location.create({ client: alcoa._id, name: 'Pump Room 1', code: 'PR1', kind: 'area', parent: site._id });
  await area.save();

  const sup1 = await Supplier.create({ name: 'Acme Pumps', code: 'ACME' });
  const sup2 = await Supplier.create({ name: 'SealTech', code: 'SEAL' });
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
  const seal = await Part.create({
    internalSku: 'INT-MS-50',
    name: 'Mechanical Seal 50mm',
    category: 'Seals',
    unit: 'ea',
    supplierOptions: [
      { supplier: sup2._id, supplierSku: 'ST-MS50', price: 120.0, currency: 'USD', leadTimeDays: 7, preferred: true }
    ],
    internal: { onHand: 4, standardCost: 95, reorderPoint: 1, reorderQty: 1 }
  });

  const impeller = await Part.create({
    internalSku: 'INT-IMP-200',
    name: 'Impeller 200mm',
    category: 'Impellers',
    unit: 'ea',
    supplierOptions: [
      { supplier: sup1._id, supplierSku: 'AC-IMP200', price: 450.0, currency: 'USD', leadTimeDays: 21 }
    ],
    internal: { onHand: 1, standardCost: 400, reorderPoint: 1, reorderQty: 1 }
  });

  const asset = await Asset.create({
    client: alcoa._id,
    location: area._id,
    name: 'Process Pump 001',
    tag: 'P-001',
    category: 'Pumps',
    model: 'KSB Etanorm 50-200',
    serial: 'SN123456',
    status: 'active',
    notes: 'Baseline asset seeded',
    bom: [
      { part: seal._id, qty: 1, unit: 'ea', notes: 'preferred' },
      { part: impeller._id, qty: 1, unit: 'ea' },
      { partName: 'Gasket 50mm', qty: 2, unit: 'ea' }
    ],
    supplier: 'Acme Pumps',
  });

  console.log('Admin login: admin@example.com / admin123');
  console.log('Done.');
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});


  // Create a global pump template
  await BomTemplate.create({
    name: 'Standard Pump BOM',
    category: 'pump',
    client: null,
    lines: [
      { part: (await Part.findOne({ internalSku: 'INT-MS-50' }))._id, qty: 1, unit: 'ea', notes: 'seal' },
      { part: (await Part.findOne({ internalSku: 'INT-IMP-200' }))._id, qty: 1, unit: 'ea', notes: 'impeller' }
    ]
  });

  // Create a client-scoped variant
  await BomTemplate.create({
    name: 'Wagerup Pump Service Kit',
    client: (await Client.findOne({ code: 'ALCOA' }))._id,
    category: 'service-kit',
    lines: [
      { partName: 'Gasket Set', qty: 1, unit: 'set' },
      { partName: 'Bearing 6205', qty: 2, unit: 'ea' }
    ]
  });

  console.log('Seeded example BOM templates.');
