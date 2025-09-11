import express from 'express';
import { z } from 'zod';
import Job, { JOB_STATUSES } from '../models/Job.js';
import Asset from '../models/Asset.js';
import Client from '../models/Client.js';
import Location from '../models/Location.js';
import { paginateParams } from '../utils/paginate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// ---------- validation ----------
const jobCreate = z.object({
  jobNumber: z.string().min(1),
  poNumber: z.string().optional().default(''),
  client: z.string().min(1),
  location: z.string().optional().nullable(),
  asset: z.string().optional().nullable(),
  title: z.string().min(1),
  description: z.string().optional().default(''),
  startDate: z.coerce.date().optional().nullable(),
  status: z.enum([
    'investigate_quote','quoted','po_received','awaiting_parts',
    'parts_received','require_plan_date','planned','in_progress','invoice'
  ]).optional().default('investigate_quote')
});

const jobUpdate = jobCreate.partial();

// ---------- list with filters ----------
router.get('/jobs', async (req, res) => {
  const { page, limit, skip } = paginateParams(req);
  const q = req.query.q ? String(req.query.q) : '';
  const status = req.query.status ? String(req.query.status) : '';
  const client = req.query.client ? String(req.query.client) : '';
  const asset = req.query.asset ? String(req.query.asset) : '';

  const filter = {};
  if (status && JOB_STATUSES.includes(status)) filter.status = status;
  if (client) filter.client = client;
  if (asset) filter.asset = asset;
  if (q) {
    filter.$or = [
      { jobNumber: new RegExp(q, 'i') },
      { poNumber:  new RegExp(q, 'i') },
      { title:     new RegExp(q, 'i') },
      { description: new RegExp(q, 'i') }
    ];
  }

  const [items, total] = await Promise.all([
    Job.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit)
      .populate('client', 'name code')
      .populate('location', 'name code kind')
      .populate('asset', 'name tag model')
      .lean(),
    Job.countDocuments(filter)
  ]);

  res.json({ items, total, page, pages: Math.ceil(total/limit), statuses: JOB_STATUSES });
});

// ---------- create ----------
router.post('/jobs', requireAuth, async (req, res) => {
  const data = jobCreate.parse(req.body);
  const [c, l, a] = await Promise.all([
    Client.findById(data.client).lean(),
    data.location ? Location.findById(data.location).lean() : null,
    data.asset ? Asset.findById(data.asset).lean() : null
  ]);
  if (!c) return res.status(400).json({ error: 'Invalid client' });
  if (data.location && !l) return res.status(400).json({ error: 'Invalid location' });
  if (data.asset && !a) return res.status(400).json({ error: 'Invalid asset' });

  const made = await Job.create(data);
  res.status(201).json(made);
});

// ---------- read ----------
router.get('/jobs/:id', async (req, res) => {
  const item = await Job.findById(req.params.id)
    .populate('client', 'name code')
    .populate('location', 'name code kind')
    .populate('asset', 'name tag model')
    .lean();
  if (!item) return res.status(404).json({ error: 'Job not found' });
  res.json({ job: item, statuses: JOB_STATUSES });
});

// ---------- update ----------
router.patch('/jobs/:id', requireAuth, async (req, res) => {
  const data = jobUpdate.parse(req.body);
  const item = await Job.findByIdAndUpdate(req.params.id, data, { new: true });
  if (!item) return res.status(404).json({ error: 'Job not found' });
  res.json(item);
});

// ---------- delete ----------
router.delete('/jobs/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const out = await Job.findByIdAndDelete(req.params.id);
  if (!out) return res.status(404).json({ error: 'Job not found' });
  res.json({ ok: true });
});

// ---------- resources ----------
const resourceSchema = z.object({
  person: z.string().min(1),
  role: z.string().optional().default(''),
  hours: z.coerce.number().min(0).default(0),
  date: z.coerce.date().optional().nullable(),
  notes: z.string().optional().default('')
});

router.post('/jobs/:id/resources', requireAuth, async (req, res) => {
  const data = resourceSchema.parse(req.body);
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  job.resources.push(data);
  await job.save();
  res.status(201).json(job);
});

router.patch('/jobs/:id/resources/:rid', requireAuth, async (req, res) => {
  const patch = resourceSchema.partial().parse(req.body);
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const r = job.resources.id(req.params.rid);
  if (!r) return res.status(404).json({ error: 'Resource not found' });
  Object.assign(r, patch);
  await job.save();
  res.json(job);
});

router.delete('/jobs/:id/resources/:rid', requireAuth, async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const r = job.resources.id(req.params.rid);
  if (!r) return res.status(404).json({ error: 'Resource not found' });
  r.deleteOne();
  await job.save();
  res.json(job);
});

export default router;
