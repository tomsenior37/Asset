import express from 'express';
import { parse as csvParse } from 'csv-parse';
import { stringify as csvStringify } from 'csv-stringify';
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
  clients: ['code','name','notes','addressLine1','addressLine2','city','state','postcode','country','contactName','phone','email','website'],
  locations: ['client_code','kind(site|area)','code','name','parent_code(optional)'],
  assets: ['client_code','location_code','name','tag','category','model','serial','status(active|spare|retired|missing)','notes'],
  parts: ['internalSku','name','category','unit','notes','onHand','standardCost','reorderPoint','reorderQty'],
  suppliers: ['code','name','email','phone','website','address','notes'],
  supplier_parts: ['supplier_code','part_internalSku','supplierSku','price','currency','leadTimeDays','moq','preferred(true|false)'],
  jobs: ['jobNumber(5-digits)','poNumber','client_code','location_code(optional)','asset_tag(optional)','title','description','startDate(YYYY-MM-DD)','quoteDueDate(YYYY-MM-DD)','status(investigate_quote|quoted|po_received|awaiting_parts|parts_received|require_plan_date|planned|in_progress|invoice)']
};

/* ------------------------------ UTILITIES --------------------------------- */
function sendCSV(res, filename, rows, header = true) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  csvStringify(rows, { header }).pipe(res);
}
function readCSV(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const csv = Buffer.concat(chunks).toString('utf8');
      const rows = [];
      csvParse(csv, { columns: true, skip_empty_lines: true, trim: true })
        .on('readable', function(){ let r; while((r=this.read())) rows.push(r); })
        .on('end', () => resolve(rows))
        .on('error', (e) => reject(e));
    });
    req.on('error', reject);
  });
}
async function clientByCode(code){ return code ? Client.findOne({ code: String(code).toUpperCase() }).lean() : null; }
async function locByCode(clientId, code){ return (clientId && code) ? Location.findOne({ client: clientId, code }).lean() : null; }

/* ------------------------------ PUBLIC TEMPLATES -------------------------- */
router.get('/imports/template/:type', (req, res) => {
  const type = String(req.params.type || '').toLowerCase();
  if (!TEMPLATES[type]) return res.status(400).json({ error: 'Unknown template type' });
  return sendCSV(res, `${type}_template.csv`, [TEMPLATES[type]], false);
});

/* -------------------------------- EXPORTS --------------------------------- */
router.get('/exports/:type', requireAuth, async (req, res) => {
  const type = String(req.params.type || '').toLowerCase();
  try {
    if (type === 'clients') {
      const items = await Client.find().lean();
      const rows = [TEMPLATES.clients, ...items.map(c => [
        c.code, c.name, c.notes||'', c.addressLine1||'', c.addressLine2||'',
        c.city||'', c.state||'', c.postcode||'', c.country||'',
        c.contactName||'', c.phone||'', c.email||'', c.website||''
      ])];
      return sendCSV(res, 'clients.csv', rows, false);
    }

    if (type === 'locations') {
      const items = await Location.find().lean();
      const clients = await Client.find().lean();
      const codeByClient = Object.fromEntries(clients.map(c => [String(c._id), c.code]));
      const byId = Object.fromEntries(items.map(l => [String(l._id), l]));
      const rows = [TEMPLATES.locations, ...items.map(l => [
        codeByClient[String(l.client)]||'', l.kind, l.code, l.name, l.parent ? (byId[String(l.parent)]?.code||'') : ''
      ])];
      return sendCSV(res, 'locations.csv', rows, false);
    }

    if (type === 'assets') {
      const items = await Asset.find().lean();
      const locs = await Location.find().lean();
      const clients = await Client.find().lean();
      const locCodeById = Object.fromEntries(locs.map(l => [String(l._id), l.code]));
      const clientCodeById = Object.fromEntries(clients.map(c => [String(c._id), c.code]));
      const rows = [TEMPLATES.assets, ...items.map(a => [
        clientCodeById[String(a.client)]||'', locCodeById[String(a.location)]||'',
        a.name, a.tag||'', a.category||'', a.model||'', a.serial||'', a.status||'active', a.notes||''
      ])];
      return sendCSV(res, 'assets.csv', rows, false);
    }

    if (type === 'parts') {
      const items = await Part.find().lean();
      const rows = [TEMPLATES.parts, ...items.map(p => [
        p.internalSku, p.name, p.category||'', p.unit||'', p.notes||'',
        (p.internal?.onHand??0),(p.internal?.standardCost??0),(p.internal?.reorderPoint??0),(p.internal?.reorderQty??0)
      ])];
      return sendCSV(res, 'parts.csv', rows, false);
    }

    if (type === 'suppliers') {
      const items = await Supplier.find().lean();
      const rows = [TEMPLATES.suppliers, ...items.map(s => [
        s.code, s.name, s.email||'', s.phone||'', s.website||'', s.address||'', s.notes||''
      ])];
      return sendCSV(res, 'suppliers.csv', rows, false);
    }

    if (type === 'supplier_parts') {
      const items = await Part.find().lean();
      const suppliers = await Supplier.find().lean();
      const supCodeById = Object.fromEntries(suppliers.map(s => [String(s._id), s.code]));
      const header = TEMPLATES.supplier_parts;
      const rows = [header];
      for (const p of items) {
        for (const opt of (p.supplierOptions || [])) {
          rows.push([
            supCodeById[String(opt.supplier)] || '',
            p.internalSku,
            opt.supplierSku || '',
            opt.price ?? 0,
            opt.currency || 'USD',
            opt.leadTimeDays ?? 0,
            opt.moq ?? 1,
            opt.preferred ? 'true' : 'false'
          ]);
        }
      }
      return sendCSV(res, 'supplier_parts.csv', rows, false);
    }

    if (type === 'jobs') {
      const items = await Job.find().lean();
      const clients = await Client.find().lean();
      const locs = await Location.find().lean();
      const clientCodeById = Object.fromEntries(clients.map(c => [String(c._id), c.code]));
      const locCodeById = Object.fromEntries(locs.map(l => [String(l._id), l.code]));
      const rows = [TEMPLATES.jobs, ...items.map(j => [
        j.jobNumber, j.poNumber || '', clientCodeById[String(j.client)] || '',
        j.location ? (locCodeById[String(j.location)] || '') : '',
        '', // asset_tag not exported (optional)
        j.title, j.description || '',
        j.startDate ? new Date(j.startDate).toISOString().slice(0,10) : '',
        j.quoteDueDate ? new Date(j.quoteDueDate).toISOString().slice(0,10) : '',
        j.status || 'investigate_quote'
      ])];
      return sendCSV(res, 'jobs.csv', rows, false);
    }

    return res.status(400).json({ error: 'Unknown export type' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

/* --------------------------- CORE IMPORTERS ------------------------------- */
async function importClients(rows, dryRun){
  const details=[]; let inserted=0, updated=0, errors=0;
  for (let i=0;i<rows.length;i++){
    try{
      const r=rows[i]; const code=String(r.code||'').toUpperCase(); const name=r.name;
      if(!code || !name) throw new Error('code and name required');
      const payload = {
        name, code,
        notes:r.notes||'',
        addressLine1:r.addressLine1||'', addressLine2:r.addressLine2||'',
        city:r.city||'', state:r.state||'', postcode:r.postcode||'', country:r.country||'',
        contactName:r.contactName||'', phone:r.phone||'', email:r.email||'', website:r.website||''
      };
      if(!dryRun){
        const doc = await Client.findOneAndUpdate({ code }, { $set: payload }, { new:true, upsert:true, setDefaultsOnInsert:true });
        const act = (doc.createdAt.getTime()===doc.updatedAt.getTime()) ? 'insert' : 'update';
        act==='insert'?inserted++:updated++;
        details.push({ rowIndex:i+1, ok:true, action:act, message:'ok' });
      } else {
        details.push({ rowIndex:i+1, ok:true, action:'validate', message:'ok' });
      }
    }catch(e){ errors++; details.push({ rowIndex:i+1, ok:false, action:'error', message:e.message }); }
  }
  return { rows:details, summary:{ inserted, updated, errors, total:rows.length } };
}

async function importLocations(rows, dryRun){
  const details=[]; let inserted=0, updated=0, errors=0;
  for(let i=0;i<rows.length;i++){
    try{
      const r=rows[i]; const c=await clientByCode(r.client_code);
      if(!c) throw new Error('client_code not found');
      const kind=String(r['kind(site|area)']||r.kind||'').toLowerCase();
      if(!['site','area'].includes(kind)) throw new Error('kind must be site or area');
      const code=r.code, name=r.name; if(!code||!name) throw new Error('code and name required');
      let parent=null; const parentCode=r['parent_code(optional)']||r.parent_code||'';
      if(kind==='area'){
        parent = await locByCode(c._id, parentCode);
        if(!parent) throw new Error('area requires valid parent_code (site)');
      }
      if(!dryRun){
        const doc = await Location.findOneAndUpdate(
          { client:c._id, code },
          { $set:{ client:c._id, code, name, kind, parent: parent?parent._id:null }},
          { new:true, upsert:true, setDefaultsOnInsert:true }
        );
        const act=(doc.createdAt.getTime()===doc.updatedAt.getTime())?'insert':'update';
        act==='insert'?inserted++:updated++;
        details.push({ rowIndex:i+1, ok:true, action:act, message:'ok' });
      } else {
        details.push({ rowIndex:i+1, ok:true, action:'validate', message:'ok' });
      }
    }catch(e){ errors++; details.push({ rowIndex:i+1, ok:false, action:'error', message:e.message }); }
  }
  return { rows:details, summary:{ inserted, updated, errors, total:rows.length } };
}

async function importAssets(rows, dryRun){
  // client_code optional: infer client from location_code
  const details=[]; let inserted=0, updated=0, errors=0;

  const allLocs = await Location.find().select('client code').lean();
  const byCode = new Map();
  for (const l of allLocs) {
    const arr = byCode.get(l.code) || [];
    arr.push(l);
    byCode.set(l.code, arr);
  }
  const allowedStatus = ['active','spare','retired','missing'];

  for(let i=0;i<rows.length;i++){
    try{
      const r=rows[i];
      const location_code = String(r.location_code||'').trim();
      if(!location_code) throw new Error('location_code required');

      let client = null;
      if (r.client_code) {
        client = await clientByCode(r.client_code);
        if(!client) throw new Error('client_code not found');
      }

      let loc = null;
      if (client) {
        loc = await Location.findOne({ client: client._id, code: location_code }).lean();
        if(!loc) throw new Error('location_code not found for client');
      } else {
        const candidates = byCode.get(location_code) || [];
        if (candidates.length === 0) throw new Error(`location_code not found: ${location_code}`);
        if (candidates.length > 1) throw new Error(`ambiguous location_code (exists under multiple clients): ${location_code}`);
        loc = candidates[0];
        client = await Client.findById(loc.client).lean();
        if(!client) throw new Error('internal error: location has no client');
      }

      const name = String(r.name||'').trim();
      if (!name) throw new Error('name required');

      const statusRaw = String(r.status||'').toLowerCase();
      const status = allowedStatus.includes(statusRaw) ? statusRaw : 'active';

      const payload = {
        client: client._id, location: loc._id,
        name,
        tag: String(r.tag||'').trim(),
        category: String(r.category||'').trim(),
        model: String(r.model||'').trim(),
        serial: String(r.serial||'').trim(),
        status,
        notes: String(r.notes||'').trim()
      };

      if(!dryRun){
        const doc = await Asset.findOneAndUpdate(
          { client: payload.client, location: payload.location, name: payload.name, tag: payload.tag },
          { $set: payload },
          { new:true, upsert:true, setDefaultsOnInsert:true }
        );
        const act=(doc.createdAt.getTime()===doc.updatedAt.getTime())?'insert':'update';
        act==='insert'?inserted++:updated++;
        details.push({ rowIndex:i+1, ok:true, action:act, message:'ok' });
      } else {
        details.push({ rowIndex:i+1, ok:true, action:'validate', message:'ok' });
      }
    }catch(e){ errors++; details.push({ rowIndex:i+1, ok:false, action:'error', message:e.message }); }
  }
  return { rows:details, summary:{ inserted, updated, errors, total:rows.length } };
}

async function importParts(rows, dryRun){
  const details=[]; let inserted=0, updated=0, errors=0;
  for(let i=0;i<rows.length;i++){
    try{
      const r=rows[i]; const internalSku=r.internalSku; const name=r.name;
      if(!internalSku||!name) throw new Error('internalSku and name required');
      const payload={
        internalSku, name, category:r.category||'', unit:r.unit||'', notes:r.notes||'',
        specs:{}, supplierOptions:[],
        internal:{ onHand:Number(r.onHand||0), standardCost:Number(r.standardCost||0), reorderPoint:Number(r.reorderPoint||0), reorderQty:Number(r.reorderQty||0) }
      };
      if(!dryRun){
        const doc=await Part.findOneAndUpdate({ internalSku }, { $set:payload }, { new:true, upsert:true, setDefaultsOnInsert:true });
        const act=(doc.createdAt.getTime()===doc.updatedAt.getTime())?'insert':'update';
        act==='insert'?inserted++:updated++;
        details.push({ rowIndex:i+1, ok:true, action:act, message:'ok' });
      } else {
        details.push({ rowIndex:i+1, ok:true, action:'validate', message:'ok' });
      }
    }catch(e){ errors++; details.push({ rowIndex:i+1, ok:false, action:'error', message:e.message }); }
  }
  return { rows:details, summary:{ inserted, updated, errors, total:rows.length } };
}

async function importSuppliers(rows, dryRun){
  const details=[]; let inserted=0, updated=0, errors=0;
  for(let i=0;i<rows.length;i++){
    try{
      const r=rows[i]; const code=String(r.code||'').toUpperCase(); const name=r.name;
      if(!code||!name) throw new Error('code and name required');
      const payload={ code, name, email:r.email||'', phone:r.phone||'', website:r.website||'', address:r.address||'', notes:r.notes||'' };
      if(!dryRun){
        const doc=await Supplier.findOneAndUpdate({ code }, { $set:payload }, { new:true, upsert:true, setDefaultsOnInsert:true });
        const act=(doc.createdAt.getTime()===doc.updatedAt.getTime())?'insert':'update';
        act==='insert'?inserted++:updated++;
        details.push({ rowIndex:i+1, ok:true, action:act, message:'ok' });
      } else {
        details.push({ rowIndex:i+1, ok:true, action:'validate', message:'ok' });
      }
    }catch(e){ errors++; details.push({ rowIndex:i+1, ok:false, action:'error', message:e.message }); }
  }
  return { rows:details, summary:{ inserted, updated, errors, total:rows.length } };
}

async function importSupplierParts(rows, dryRun){
  const details=[]; let linked=0, updated=0, errors=0;
  for(let i=0;i<rows.length;i++){
    try{
      const r=rows[i];
      const sup=await Supplier.findOne({ code:String(r.supplier_code||'').toUpperCase() });
      const part=await Part.findOne({ internalSku:r.part_internalSku });
      if(!sup) throw new Error('supplier_code not found');
      if(!part) throw new Error('part_internalSku not found');
      const payload={ supplier:sup._id, supplierSku:r.supplierSku||'', price:Number(r.price||0), currency:r.currency||'USD', leadTimeDays:Number(r.leadTimeDays||0), moq:Number(r.moq||1), preferred:String(r.preferred||'').toLowerCase()==='true' };
      if(!dryRun){
        const idx=(part.supplierOptions||[]).findIndex(o=>String(o.supplier)===String(sup._id));
        if(idx>=0){ part.supplierOptions[idx]=payload; updated++; }
        else { part.supplierOptions.push(payload); linked++; }
        await part.save();
        details.push({ rowIndex:i+1, ok:true, action: idx>=0?'update':'insert', message:'ok' });
      } else {
        details.push({ rowIndex:i+1, ok:true, action:'validate', message:'ok' });
      }
    }catch(e){ errors++; details.push({ rowIndex:i+1, ok:false, action:'error', message:e.message }); }
  }
  return { rows:details, summary:{ linked, updated, errors, total:rows.length } };
}

async function importJobs(rows, dryRun){
  const details=[]; let inserted=0, updated=0, errors=0;
  for(let i=0;i<rows.length;i++){
    try{
      const r=rows[i];
      const jobNumber=r['jobNumber(5-digits)']||r.jobNumber; const title=r.title;
      if(!jobNumber||!title) throw new Error('jobNumber and title required');
      const c=await clientByCode(r.client_code); if(!c) throw new Error('client_code not found');

      let location=null; if(r.location_code){
        const loc=await locByCode(c._id, r.location_code); if(!loc) throw new Error('location_code not found'); location=loc._id;
      }
      let asset=null; if(r.asset_tag){
        const a=await Asset.findOne({ client:c._id, tag:r.asset_tag }); if(a) asset=a._id;
      }

      const status=(r.status||'investigate_quote').toLowerCase();
      const valid=JOB_STATUSES.includes(status)?status:'investigate_quote';
      const payload={
        jobNumber, poNumber:r.poNumber||'', client:c._id, location, asset,
        title, description:r.description||'',
        startDate:r.startDate?new Date(r.startDate):null,
        quoteDueDate:r.quoteDueDate?new Date(r.quoteDueDate):null,
        status:valid
      };

      if(!dryRun){
        const doc=await Job.findOneAndUpdate({ jobNumber }, { $set:payload }, { new:true, upsert:true, setDefaultsOnInsert:true });
        const act=(doc.createdAt.getTime()===doc.updatedAt.getTime())?'insert':'update';
        act==='insert'?inserted++:updated++;
        details.push({ rowIndex:i+1, ok:true, action:act, message:'ok' });
      } else {
        details.push({ rowIndex:i+1, ok:true, action:'validate', message:'ok' });
      }
    }catch(e){ errors++; details.push({ rowIndex:i+1, ok:false, action:'error', message:e.message }); }
  }
  return { rows:details, summary:{ inserted, updated, errors, total:rows.length } };
}

/* --------------------------- IMPORT + DRY-RUN ----------------------------- */
const HANDLERS = {
  clients: importClients,
  locations: importLocations,
  assets: importAssets,
  parts: importParts,
  suppliers: importSuppliers,
  supplier_parts: importSupplierParts,
  jobs: importJobs
};

router.post('/imports/:type', requireAuth, requireRole('admin'), async (req, res) => {
  try{
    const type=String(req.params.type||'').toLowerCase();
    const handler=HANDLERS[type];
    if(!handler) return res.status(400).json({ error:'Unknown import type' });

    const rows=await readCSV(req);
    const dryRun = String(req.query.dry_run||'0')==='1';
    const result = await handler(rows, dryRun);
    res.json({ ok:true, type, dryRun, ...result, template: TEMPLATES[type]||[] });
  }catch(e){
    res.status(400).json({ error:e.message });
  }
});

/* ------------------------ WIZARD: TRANSFORMERS ---------------------------- */
// Locations wizard (preview/download)
router.post('/imports/wizard/locations', requireAuth, requireRole('admin'), async (req, res) => {
  try{
    const rows = await readCSV(req);
    const defaultClient = String(req.query.client_code || '').toUpperCase() || null;
    const preview = String(req.query.preview || '0') === '1';

    const out = [TEMPLATES.locations];
    const details = [];
    let ok=0, bad=0;

    for (let i=0;i<rows.length;i++){
      const r = rows[i];
      const client_code = (String(r.client_code || r.Client || r.Company || defaultClient || '')).toUpperCase();
      const name = r.name || r.Location || r['Location Name'] || r['Site Name'] || '';
      const code = r.code || r['Location ID'] || r['Code'] || r['Site Code'] || r['Location'] || '';
      const parent_code = r['parent_code(optional)'] || r['Parent'] || r['Parent Location'] || r['Site'] || '';
      const kindSource = (r.kind || r.Type || r['Location Type'] || '').toLowerCase();
      const kind = (kindSource==='area' || kindSource==='site') ? kindSource : (parent_code ? 'area' : 'site');

      if (!client_code || !name || !code){
        bad++; details.push({ rowIndex:i+1, ok:false, message:'Missing client_code or name or code' });
        continue;
      }

      out.push([client_code, kind, String(code).trim(), String(name).trim(), String(parent_code||'').trim()]);
      ok++; details.push({ rowIndex:i+1, ok:true, message:'ok' });
    }

    if (preview) return res.json({ ok:true, type:'wizard_locations', template:TEMPLATES.locations, summary:{ok,bad,total:rows.length}, rows:details });
    return sendCSV(res, 'locations.csv', out, false);
  }catch(e){ return res.status(400).json({ error:e.message }); }
});

// Assets wizard (preview/download) – ignore company/client in source; require known location
router.post('/imports/wizard/assets', requireAuth, requireRole('admin'), async (req, res) => {
  try{
    const rows = await readCSV(req);
    const preview = String(req.query.preview || '0') === '1';
    const outputClientCode = String(req.query.client_code || '').toUpperCase() || null;
    const useDb = String(req.query.use_db_locations || '1') === '1';

    const knownLocs = new Set();
    if (useDb) {
      const all = await Location.find().select('code').lean();
      for (const l of all) knownLocs.add(String(l.code).trim());
    }

    const out = [TEMPLATES.assets];
    const details = [];
    let ok=0, skipped=0, bad=0;

    for (let i=0;i<rows.length;i++){
      const r = rows[i];

      const locCode =
        r.location_code || r['Location Code'] || r['Location'] || r['Location Name'] ||
        r['Area'] || r['Site'] || r['Site Code'] || r['Area Code'] || '';

      const name = r.name || r['Asset Name'] || r['Name'] || '';
      const tag = r.tag || r['Asset Tag'] || r['Tag'] || '';
      const category = r.category || r['Category'] || '';
      const model = r.model || r['Model'] || '';
      const serial = r.serial || r['Serial'] || '';
      const statusRaw = (r.status || r['Status'] || '').toLowerCase();
      const allowedStatus = ['active','spare','retired','missing'];
      const status = allowedStatus.includes(statusRaw) ? statusRaw : 'active';
      const notes = r.notes || r['Notes'] || '';

      if (!locCode || !name){
        bad++; details.push({ rowIndex:i+1, ok:false, message:'Missing location or name' });
        continue;
      }

      if (useDb && !knownLocs.has(String(locCode).trim())){
        skipped++; details.push({ rowIndex:i+1, ok:false, message:`Location not found: ${locCode} (skipped)` });
        continue;
      }

      const client_code = outputClientCode || ''; // per your rule, can be blank
      out.push([ client_code, String(locCode).trim(), String(name).trim(), String(tag||'').trim(), String(category||'').trim(), String(model||'').trim(), String(serial||'').trim(), status, String(notes||'').trim() ]);
      ok++; details.push({ rowIndex:i+1, ok:true, message:'ok' });
    }

    if (preview) return res.json({ ok:true, type:'wizard_assets', template:TEMPLATES.assets, summary:{ ok, skipped, bad, total:rows.length }, rows:details });
    return sendCSV(res, 'assets.csv', out, false);
  }catch(e){ return res.status(400).json({ error:e.message }); }
});

export default router;
