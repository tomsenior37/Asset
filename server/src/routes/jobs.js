import express from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import Job, { JOB_STATUSES } from '../models/Job.js';
import Asset from '../models/Asset.js';
import Client from '../models/Client.js';
import Location from '../models/Location.js';
import { paginateParams } from '../utils/paginate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

/* ---------------- validation ---------------- */
const JobCreate = z.object({
  jobNumber: z.string().min(5).max(10),
  poNumber: z.string().optional().default(''),
  client: z.string().min(1),
  location: z.string().optional().nullable(),
  asset: z.string().optional().nullable(),
  title: z.string().min(1),
  description: z.string().optional().default(''),
  startDate: z.coerce.date().optional().nullable(),
  quoteDueDate: z.coerce.date().optional().nullable(),
  status: z.enum([
    'investigate_quote','quoted','po_received','awaiting_parts',
    'parts_received','require_plan_date','planned','in_progress','invoice'
  ]).optional().default('investigate_quote')
});
const JobUpdate = JobCreate.partial();

const ResourcePatch = z.object({
  person: z.string().optional(),
  role: z.string().optional(),
  hours: z.coerce.number().min(0).optional(),
  date: z.coerce.date().optional().nullable(),
  notes: z.string().optional()
});

const AttachmentKind = z.enum(['rcs','correspondence','supplier_quote','other']);

/* ---------------- list w/ filters & search ---------------- */
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
    const re = new RegExp(q, 'i');
    filter.$or = [{ jobNumber: re }, { poNumber: re }, { title: re }, { description: re }];
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

/* ---------------- create ---------------- */
router.post('/jobs', requireAuth, async (req, res) => {
  const data = JobCreate.parse(req.body);
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

/* ---------------- read ---------------- */
router.get('/jobs/:id', async (req, res) => {
  const item = await Job.findById(req.params.id)
    .populate('client', 'name code')
    .populate('location', 'name code kind')
    .populate('asset', 'name tag model')
    .lean();
  if (!item) return res.status(404).json({ error: 'Job not found' });
  res.json({ job: item, statuses: JOB_STATUSES });
});

/* ---------------- update/delete ---------------- */
router.patch('/jobs/:id', requireAuth, async (req, res) => {
  const data = JobUpdate.parse(req.body);
  const item = await Job.findByIdAndUpdate(req.params.id, data, { new: true });
  if (!item) return res.status(404).json({ error: 'Job not found' });
  res.json(item);
});
router.delete('/jobs/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const out = await Job.findByIdAndDelete(req.params.id);
  if (!out) return res.status(404).json({ error: 'Job not found' });
  res.json({ ok: true });
});

/* ---------------- resources ---------------- */
router.post('/jobs/:id/resources', requireAuth, async (req, res) => {
  const patch = ResourcePatch.parse(req.body);
  if (!patch.person) return res.status(400).json({ error: 'person required' });
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  job.resources.push(patch);
  await job.save();
  res.status(201).json(job);
});
router.patch('/jobs/:id/resources/:rid', requireAuth, async (req, res) => {
  const patch = ResourcePatch.partial().parse(req.body);
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

/* ---------------- attachments (RCS/Correspondence/Supplier Quotes) ---------------- */
const uploadRoot = path.resolve(process.cwd(), 'uploads', 'jobs');
fs.mkdirSync(uploadRoot, { recursive: true });
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dest = path.join(uploadRoot, req.params.id);
    fs.mkdirSync(dest, { recursive: true }); cb(null, dest);
  },
  filename: function (_req, file, cb) {
    cb(null, Date.now() + '_' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage });

router.get('/jobs/:id/attachments', async (req, res) => {
  const job = await Job.findById(req.params.id).lean();
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job.attachments || []);
});
router.post('/jobs/:id/attachments', requireAuth, upload.single('file'), async (req, res) => {
  const kind = AttachmentKind.parse(req.body.kind || 'other');
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  job.attachments.push({
    kind,
    filename: req.file.filename,
    originalname: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
  await job.save();
  res.status(201).json({ ok: true });
});
router.delete('/jobs/:id/attachments/:filename', requireAuth, async (req, res) => {
  const { id, filename } = req.params;
  const dest = path.join(uploadRoot, id, filename);
  if (fs.existsSync(dest)) fs.unlinkSync(dest);
  await Job.updateOne({ _id: id }, { $pull: { attachments: { filename } } });
  res.json({ ok: true });
});

export default router;
