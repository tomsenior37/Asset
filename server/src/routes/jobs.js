import express from 'express';
import { z } from 'zod';
import Job from '../models/Job.js';
import Asset from '../models/Asset.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

const jobSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(''),
  status: z.enum(['open','in_progress','done','cancelled']).optional(),
  priority: z.enum(['low','normal','high','urgent']).optional(),
  dueDate: z.coerce.date().optional().nullable(),
  assignee: z.string().optional().default(''),
  createdBy: z.string().optional().default('')
});

// List jobs for an asset
router.get('/assets/:assetId/jobs', async (req, res) => {
  const assetId = req.params.assetId;
  const jobs = await Job.find({ asset: assetId }).sort({ updatedAt: -1 }).lean();
  res.json(jobs);
});

// Create job for an asset
router.post('/assets/:assetId/jobs', requireAuth, async (req, res) => {
  const asset = await Asset.findById(req.params.assetId).lean();
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  const data = jobSchema.parse(req.body);
  const made = await Job.create({
    ...data,
    asset: asset._id,
    client: asset.client
  });
  res.status(201).json(made);
});

// Update job
router.patch('/jobs/:id', requireAuth, async (req, res) => {
  const data = jobSchema.partial().parse(req.body);
  const item = await Job.findByIdAndUpdate(req.params.id, data, { new: true });
  if (!item) return res.status(404).json({ error: 'Job not found' });
  res.json(item);
});

// Delete job
router.delete('/jobs/:id', requireAuth, async (req, res) => {
  const out = await Job.findByIdAndDelete(req.params.id);
  if (!out) return res.status(404).json({ error: 'Job not found' });
  res.json({ ok: true });
});

export default router;
