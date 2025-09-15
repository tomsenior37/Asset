import express from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { parse as csvParse } from 'csv-parse';
import { stringify as csvStringify } from 'csv-stringify';

import Asset from '../models/Asset.js';
import Client from '../models/Client.js';
import Location from '../models/Location.js';
import Part from '../models/Part.js';
import { paginateParams } from '../utils/paginate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// ---------- uploads root ----------
const uploadRoot = path.resolve(process.cwd(), 'uploads', 'assets');
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dest = path.join(uploadRoot, req.params.id);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: function (_req, file, cb) {
    cb(null, Date.now() + '_' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage });

// ---------- validation ----------
const bomItem = z.object({
  part: z.string().optional().nullable(),
  partName: z.string().optional().default(''),
  partNo: z.string().optional().default(''),
  qty: z.coerce.number().min(0).default(1),
  unit: z.string().optional().default(''),
  notes: z.string().optional().default('')
});

const assetSchema = z.object({
  client: z.string().min(1),
  location: z.string().min(1),
  name: z.string().min(1),
  tag: z.string().optional().default(''),
  category: z.string().optional().default(''),
  model: z.string().optional().default(''),
  serial: z.string().optional().default(''),
  status: z.enum(['active','spare','retired','missing']).optional(),
  notes: z.string().optional().default(''),
  bom: z.array(bomItem).optional().default([]),
  purchaseDate: z.coerce.date().optional(),
  supplier: z.string().optional().default(''),
  mainPhoto: z.string().optional().default('')
});

// ---------- list ----------
router.get('/', async (req, res) => {
  const { page, limit, skip } = paginateParams(req);
  const q = req.query.q ? String(req.query.q) : '';
  const client = req.query.client ? String(req.query.client) : null;
  const location = req.query.location ? String(req.query.location) : null;

  const filter = {};
  if (client) filter.client = client;
  if (location) filter.location = location;
  if (q) filter.$text = { $search: q };

  const [items, total] = await Promise.all([
    Asset.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Asset.countDocuments(filter)
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

// ---------- create ----------
router.post('/', requireAuth, async (req, res) => {
  const data = assetSchema.parse(req.body);
  const [c, l] = await Promise.all([
    Client.findById(data.client).lean(),
    Location.findById(data.location).lean()
  ]);
  if (!c) return res.status(400).json({ error: 'Invalid client' });
  if (!l) return res.status(400).json({ error: 'Invalid location' });

  const partIds = (data.bom || []).map(b => b.part).filter(Boolean);
  if (partIds.length) {
    const count = await Part.countDocuments({ _id: { $in: partIds } });
    if (count !== partIds.length) return res.status(400).json({ error: 'Invalid Part reference in BOM' });
  }

  const made = await Asset.create(data);
  res.status(201).json(made);
});

// ---------- read ----------
router.get('/:id', async (req, res) => {
  const item = await Asset.findById(req.params.id).lean();
  if (!item) return res.status(404).json({ error: 'Asset not found' });
  res.json(item);
});

// ---------- update ----------
router.patch('/:id', requireAuth, async (req, res) => {
  const data = assetSchema.partial().parse(req.body);
  const item = await Asset.findByIdAndUpdate(req.params.id, data, { new: true });
  if (!item) return res.status(404).json({ error: 'Asset not found' });
  res.json(item);
});

// ---------- delete ----------
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const out = await Asset.findByIdAndDelete(req.params.id);
  if (!out) return res.status(404).json({ error: 'Asset not found' });
  res.json({ ok: true });
});

// ---------- move ----------
router.patch('/:id/move', requireAuth, async (req, res) => {
  const schema = z.object({ location: z.string().min(1) });
  const { location } = schema.parse(req.body);
  const loc = await Location.findById(location).lean();
  if (!loc) return res.status(400).json({ error: 'Invalid location' });
  const item = await Asset.findByIdAndUpdate(req.params.id, { location }, { new: true });
  if (!item) return res.status(404).json({ error: 'Asset not found' });
  res.json(item);
});

// ---------- attachments ----------
router.post('/:id/attachments', requireAuth, upload.single('file'), async (req, res) => {
  const asset = await Asset.findById(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  asset.attachments.push({
    filename: req.file.filename,
    originalname: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
  await asset.save();
  res.status(201).json({ ok: true, attachment: asset.attachments[asset.attachments.length-1] });
});

router.get('/:id/attachments', async (req, res) => {
  const asset = await Asset.findById(req.params.id).lean();
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  res.json(asset.attachments || []);
});

router.delete('/:id/attachments/:filename', requireAuth, async (req, res) => {
  const { id, filename } = req.params;
  const dest = path.join(uploadRoot, id, filename);
  if (fs.existsSync(dest)) fs.unlinkSync(dest);
  await Asset.updateOne({ _id: id }, { $pull: { attachments: { filename } } });
  // clear mainPhoto if it was this file
  await Asset.updateOne({ _id: id, mainPhoto: filename }, { $set: { mainPhoto: '' } });
  res.json({ ok: true });
});

// ---------- set main photo ----------
router.post('/:id/main-photo', requireAuth, async (req, res) => {
  const { filename } = req.body || {};
  const asset = await Asset.findById(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  if (!asset.attachments.find(a => a.filename === filename)) {
    return res.status(400).json({ error: 'Attachment not found on asset' });
  }

  asset.mainPhoto = filename || '';
  await asset.save();
  res.json({ ok: true, mainPhoto: asset.mainPhoto });
});

// ---------- CSV import/export ----------
router.post('/import', requireAuth, requireRole('admin'), async (req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', async () => {
    const csv = Buffer.concat(chunks).toString('utf8');
    const records = [];
    const errors = [];
    let inserted = 0;
    csvParse(csv, { columns: true, skip_empty_lines: true, trim: true })
      .on('readable', function() {
        let record; while ((record = this.read())) records.push(record);
      })
      .on('end', async () => {
        for (let i=0;i<records.length;i++){
          const r = records[i];
          try {
            const client = await Client.findOne({ code: r.clientCode }).lean();
            if (!client) throw new Error('clientCode not found: ' + r.clientCode);
            let site = await Location.findOne({ client: client._id, code: r.siteCode, kind: 'site', parent: null }).lean();
            if (!site) throw new Error('siteCode not found under client: ' + r.siteCode);
            let loc = site;
            if (r.areaCode) {
              const area = await Location.findOne({ client: client._id, code: r.areaCode, kind: 'area', parent: site._id }).lean();
              if (!area) throw new Error('areaCode not found under site: ' + r.areaCode);
              loc = area;
            }
            await Asset.create({
              client: client._id,
              location: loc._id,
              name: r.name,
              tag: r.tag || '',
              category: r.category || '',
              model: r.model || '',
              serial: r.serial || '',
              status: ['active','spare','retired','missing'].includes((r.status||'').toLowerCase()) ? r.status.toLowerCase() : 'active',
              notes: r.notes || ''
            });
            inserted++;
          } catch (e) {
            errors.push({ row: i+1, error: e.message });
          }
        }
        res.json({ inserted, errors });
      })
      .on('error', (e) => res.status(400).json({ error: e.message }));
  });
});

router.get('/export/csv', async (_req, res) => {
  const assets = await Asset.find().lean();
  const locIds = Array.from(new Set(assets.map(a => String(a.location))));
  const locations = await Location.find({ _id: { $in: locIds } }).lean();
  const locById = Object.fromEntries(locations.map(l => [String(l._id), l]));
  const clientIds = Array.from(new Set(assets.map(a => String(a.client))));
  const clients = await Client.find({ _id: { $in: clientIds } }).lean();
  const clientCodeById = Object.fromEntries(clients.map(c => [String(c._id), c.code]));

  const rows = assets.map(a => {
    const loc = locById[String(a.location)] || {};
    let siteCode = '', areaCode = '';
    if (loc.kind === 'site') {
      siteCode = loc.code || '';
    } else if (loc.kind === 'area') {
      const parent = locById[String(loc.parent)] || {};
      if (parent && parent.kind === 'site') {
        siteCode = parent.code || '';
        areaCode = loc.code || '';
      }
    }
    return {
      clientCode: clientCodeById[String(a.client)] || '',
      siteCode, areaCode,
      name: a.name, tag: a.tag, category: a.category, model: a.model, serial: a.serial, status: a.status, notes: a.notes
    };
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="assets.csv"');
  csvStringify(rows, { header: true }).pipe(res);
});

export default router;
