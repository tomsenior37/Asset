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

/* PUBLIC: allow direct browser download without auth */
router.get('/imports/template/:type', (req, res) => {
  const type = String(req.params.type || '').toLowerCase();
  if (!TEMPLATES[type]) return res.status(400).json({ error: 'Unknown template type' });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${type}_template.csv"`);
  csvStringify([TEMPLATES[type]], { header: false }).pipe(res);
});

/* ----------------------------- CSV PARSER --------------------------------- */
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

/* ------------------------------ HELPERS ----------------------------------- */
async function clientByCode(code){ return code ? Client.findOne({ code: String(code).toUpperCase() }).lean() : null; }
async function locByCode(clientId, code){ return (clientId && code) ? Location.findOne({ client: clientId, code }).lean() : null; }

/* ------------------------- IMPORT/VALIDATE HANDLERS ------------------------ */
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
  const details=[]; let inserted=0, updated=0, errors=0;
  for(let i=0;i<rows.length;i++){
    try{
      const r=rows[i]; const c=await clientByCode(r.client_code);
      if(!c) throw new Error('client_code not found');
      const loc=await locByCode(c._id, r.location_code);
      if(!loc) throw new Error('location_code not found for client');
      const payload={
        client:c._id, location:loc._id,
        name:r.name, tag:r.tag||'', category:r.category||'',
        model:r.model||'', serial:r.serial||'',
        status:(['active','spare','retired','missing'].includes((r.status||'').toLowerCase()))?r.status.toLowerCase():'active',
        notes:r.notes||''
      };
      if(!payload.name) throw new Error('name required');
      if(!dryRun){
        const doc=await Asset.findOneAndUpdate(
          { client:c._id, location:loc._id, name:payload.name, tag:payload.tag },
          { $set:payload }, { new:true, upsert:true, setDefaultsOnInsert:true }
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
        specs:{},
        supplierOptions:[],
        internal:{
          onHand:Number(r.onHand||0),
          standardCost:Number(r.standardCost||0),
          reorderPoint:Number(r.reorderPoint||0),
          reorderQty:Number(r.reorderQty||0)
        }
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
      const payload={
        supplier:sup._id,
        supplierSku:r.supplierSku||'',
        price:Number(r.price||0),
        currency:r.currency||'USD',
        leadTimeDays:Number(r.leadTimeDays||0),
        moq:Number(r.moq||1),
        preferred:String(r.preferred||'').toLowerCase()==='true'
      };
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

const HANDLERS = {
  clients: importClients,
  locations: importLocations,
  assets: importAssets,
  parts: importParts,
  suppliers: importSuppliers,
  supplier_parts: importSupplierParts,
  jobs: importJobs
};

/* --------------------------- IMPORT + DRY-RUN ----------------------------- */
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

export default router;
