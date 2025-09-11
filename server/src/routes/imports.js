import express from 'express';
import { parse as csvParse } from 'csv-parse';
import { stringify as csvStringify } from 'csv-stringify';
import { z } from 'zod';

import Client from '../models/Client.js';
import Location from '../models/Location.js';
import Asset from '../models/Asset.js';
import Part from '../models/Part.js';
import Supplier from '../models/Supplier.js';
import Job, { JOB_STATUSES } from '../models/Job.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

/* ------------------------------- TEMPLATES -------------------------------- */

const TEMPLATES = {
  clients: [
    'code','name','notes','addressLine1','addressLine2','city','state','postcode','country','contactName','phone','email','website'
  ],
  locations: [
    'client_code','kind(site|area)','code','name','parent_code(optional)'
  ],
  assets: [
    'client_code','location_code','name','tag','category','model','serial','status(active|spare|retired|missing)','notes'
  ],
  parts: [
    'internalSku','name','category','unit','notes','onHand','standardCost','reorderPoint','reorderQty'
  ],
  suppliers: [
    'code','name','email','phone','website','address','notes'
  ],
  supplier_parts: [
    'supplier_code','part_internalSku','supplierSku','price','currency','leadTimeDays','moq','preferred(true|false)'
  ],
  jobs: [
    'jobNumber(5-digits)','poNumber','client_code','location_code(optional)','asset_tag(optional)',
    'title','description','startDate(YYYY-MM-DD)','quoteDueDate(YYYY-MM-DD)',
    'status(investigate_quote|quoted|po_received|awaiting_parts|parts_received|require_plan_date|planned|in_progress|invoice)'
  ]
};

router.get('/imports/template/:type', requireAuth, (req, res) => {
  const type = String(req.params.type || '').toLowerCase();
  if (!TEMPLATES[type]) return res.status(400).json({ error: 'Unknown template type' });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${type}_template.csv"`);
  const rows = [TEMPLATES[type]];
  // put one example row (empty)
  csvStringify(rows, { header: false }).pipe(res);
});

/* ----------------------------- CSV UPLOADS -------------------------------- */

function readCSV(req, cb) {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', async () => {
    const csv = Buffer.concat(chunks).toString('utf8');
    const rows = [];
    csvParse(csv, { columns: true, skip_empty_lines: true, trim: true })
      .on('readable', function () { let r; while ((r = this.read())) rows.push(r); })
      .on('end', async () => cb(null, rows))
      .on('error', (e) => cb(e));
  });
}

/* ------------------------------ HELPERS ----------------------------------- */

async function findClientByCode(code) {
  if (!code) return null;
  return await Client.findOne({ code: code.toUpperCase() }).lean();
}
async function findLocationByCode(clientId, code) {
  if (!clientId || !code) return null;
  return await Location.findOne({ client: clientId, code }).lean();
}

/* ------------------------------- IMPORTERS -------------------------------- */

async function importClients(rows) {
  let inserted = 0, updated = 0, errors = [];
  for (let i=0;i<rows.length;i++){
    const r = rows[i];
    try{
      const code = String(r.code || '').toUpperCase();
      if (!code || !r.name) throw new Error('code and name required');
      const payload = {
        name: r.name, code,
        notes: r.notes || '',
        addressLine1: r.addressLine1 || '', addressLine2: r.addressLine2 || '',
        city: r.city || '', state: r.state || '', postcode: r.postcode || '', country: r.country || '',
        contactName: r.contactName || '', phone: r.phone || '', email: r.email || '', website: r.website || ''
      };
      const existing = await Client.findOneAndUpdate({ code }, { $set: payload }, { new: true, upsert: true, setDefaultsOnInsert: true });
      if (existing.createdAt.getTime() === existing.updatedAt.getTime()) inserted++; else updated++;
    }catch(e){ errors.push({ row:i+1, error:e.message }); }
  }
  return { inserted, updated, errors };
}

async function importLocations(rows) {
  let inserted=0, updated=0, errors=[];
  for (let i=0;i<rows.length;i++){
    const r=rows[i];
    try{
      const c = await findClientByCode(r.client_code);
      if (!c) throw new Error('client_code not found');
      const kind = String(r['kind(site|area)'] || r.kind || '').toLowerCase();
      if (!['site','area'].includes(kind)) throw new Error('kind must be site or area');
      const code = r.code;
      const name = r.name;
      if (!code || !name) throw new Error('code and name required');

      let parent = null;
      const parentCode = r['parent_code(optional)'] || r.parent_code || '';
      if (parentCode) {
        parent = await findLocationByCode(c._id, parentCode);
        if (!parent) throw new Error('parent_code not found for client');
      } else if (kind === 'area') {
        throw new Error('area requires parent_code (site)');
      }

      const doc = await Location.findOneAndUpdate(
        { client: c._id, code },
        { $set: { client: c._id, code, name, kind, parent: parent ? parent._id : null } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      if (doc.createdAt.getTime() === doc.updatedAt.getTime()) inserted++; else updated++;
    }catch(e){ errors.push({ row:i+1, error:e.message }); }
  }
  return { inserted, updated, errors };
}

async function importAssets(rows) {
  let inserted=0, updated=0, errors=[];
  for (let i=0;i<rows.length;i++){
    const r=rows[i];
    try{
      const c = await findClientByCode(r.client_code);
      if (!c) throw new Error('client_code not found');
      const loc = await findLocationByCode(c._id, r.location_code);
      if (!loc) throw new Error('location_code not found for client');

      const payload = {
        client: c._id, location: loc._id,
        name: r.name, tag: r.tag || '', category: r.category || '',
        model: r.model || '', serial: r.serial || '',
        status: (['active','spare','retired','missing'].includes((r.status||'').toLowerCase())) ? r.status.toLowerCase() : 'active',
        notes: r.notes || ''
      };
      if (!payload.name) throw new Error('name required');

      const doc = await Asset.findOneAndUpdate(
        { client: c._id, location: loc._id, name: payload.name, tag: payload.tag },
        { $set: payload },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      if (doc.createdAt.getTime() === doc.updatedAt.getTime()) inserted++; else updated++;
    }catch(e){ errors.push({ row:i+1, error:e.message }); }
  }
  return { inserted, updated, errors };
}

async function importParts(rows) {
  let inserted=0, updated=0, errors=[];
  for (let i=0;i<rows.length;i++){
    const r=rows[i];
    try{
      const internalSku = r.internalSku;
      if (!internalSku || !r.name) throw new Error('internalSku and name required');
      const payload = {
        internalSku, name: r.name, category: r.category || '', unit: r.unit || '', notes: r.notes || '',
        specs: {},
        supplierOptions: [],
        internal: {
          onHand: Number(r.onHand || 0),
          standardCost: Number(r.standardCost || 0),
          reorderPoint: Number(r.reorderPoint || 0),
          reorderQty: Number(r.reorderQty || 0)
        }
      };
      const doc = await Part.findOneAndUpdate({ internalSku }, { $set: payload }, { new:true, upsert:true, setDefaultsOnInsert:true });
      if (doc.createdAt.getTime() === doc.updatedAt.getTime()) inserted++; else updated++;
    }catch(e){ errors.push({ row:i+1, error:e.message }); }
  }
  return { inserted, updated, errors };
}

async function importSuppliers(rows) {
  let inserted=0, updated=0, errors=[];
  for (let i=0;i<rows.length;i++){
    const r=rows[i];
    try{
      const code = String(r.code || '').toUpperCase();
      if (!code || !r.name) throw new Error('code and name required');
      const payload = {
        code, name: r.name,
        email: r.email || '', phone: r.phone || '',
        website: r.website || '', address: r.address || '', notes: r.notes || ''
      };
      const doc = await Supplier.findOneAndUpdate({ code }, { $set: payload }, { new:true, upsert:true, setDefaultsOnInsert:true });
      if (doc.createdAt.getTime() === doc.updatedAt.getTime()) inserted++; else updated++;
    }catch(e){ errors.push({ row:i+1, error:e.message }); }
  }
  return { inserted, updated, errors };
}

async function importSupplierParts(rows) {
  let linked=0, updated=0, errors=[];
  for (let i=0;i<rows.length;i++){
    const r=rows[i];
    try{
      const sup = await Supplier.findOne({ code: String(r.supplier_code||'').toUpperCase() });
      const part = await Part.findOne({ internalSku: r.part_internalSku });
      if (!sup) throw new Error('supplier_code not found');
      if (!part) throw new Error('part_internalSku not found');

      const payload = {
        supplier: sup._id,
        supplierSku: r.supplierSku || '',
        price: Number(r.price || 0),
        currency: r.currency || 'USD',
        leadTimeDays: Number(r.leadTimeDays || 0),
        moq: Number(r.moq || 1),
        preferred: String(r.preferred||'').toLowerCase() === 'true'
      };

      const idx = (part.supplierOptions||[]).findIndex(o => String(o.supplier) === String(sup._id));
      if (idx >= 0) { part.supplierOptions[idx] = payload; updated++; }
      else { part.supplierOptions.push(payload); linked++; }
      await part.save();
    }catch(e){ errors.push({ row:i+1, error:e.message }); }
  }
  return { linked, updated, errors };
}

async function importJobs(rows) {
  let inserted=0, updated=0, errors=[];
  for (let i=0;i<rows.length;i++){
    const r=rows[i];
    try{
      const jobNumber = r['jobNumber(5-digits)'] || r.jobNumber;
      const poNumber = r.poNumber || '';
      const title = r.title;
      if (!jobNumber || !title) throw new Error('jobNumber and title required');

      const c = await findClientByCode(r.client_code);
      if (!c) throw new Error('client_code not found');

      let location = null;
      if (r.location_code) {
        const loc = await findLocationByCode(c._id, r.location_code);
        if (!loc) throw new Error('location_code not found'); else location = loc._id;
      }

      let asset = null;
      if (r.asset_tag) {
        const a = await Asset.findOne({ client: c._id, tag: r.asset_tag });
        if (a) asset = a._id; // optional
      }

      const status = (r.status || 'investigate_quote').toLowerCase();
      const valid = JOB_STATUSES.includes(status) ? status : 'investigate_quote';

      const payload = {
        jobNumber, poNumber, client: c._id, location, asset,
        title, description: r.description || '',
        startDate: r.startDate ? new Date(r.startDate) : null,
        quoteDueDate: r.quoteDueDate ? new Date(r.quoteDueDate) : null,
        status: valid
      };

      const doc = await Job.findOneAndUpdate({ jobNumber }, { $set: payload }, { new:true, upsert:true, setDefaultsOnInsert:true });
      if (doc.createdAt.getTime() === doc.updatedAt.getTime()) inserted++; else updated++;
    }catch(e){ errors.push({ row:i+1, error:e.message }); }
  }
  return { inserted, updated, errors };
}

/* --------------------------------- ROUTE ---------------------------------- */

const HANDLERS = {
  clients: importClients,
  locations: importLocations,
  assets: importAssets,
  parts: importParts,
  suppliers: importSuppliers,
  supplier_parts: importSupplierParts,
  jobs: importJobs
};

router.post('/imports/:type', requireAuth, requireRole('admin'), (req, res) => {
  const type = String(req.params.type || '').toLowerCase();
  const handler = HANDLERS[type];
  if (!handler) return res.status(400).json({ error: 'Unknown import type' });

  readCSV(req, async (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    try{
      const result = await handler(rows);
      res.json({ ok: true, type, ...result });
    }catch(e){ res.status(500).json({ error: e.message }); }
  });
});

export default router;
