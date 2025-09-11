import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getAsset, updateAsset, listParts,
  listAssetAttachments, uploadAssetAttachment,
  deleteAssetAttachment, setMainPhoto,
  // updated job APIs (global)
  listJobsGlobal, createJobGlobal, updateJobGlobal, deleteJobGlobal
} from '../services/api';
import {
  Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Button, Select, MenuItem, Tabs, Tab, Chip
} from '@mui/material';

function BomRow({ row, index, parts, onChange, onRemove }) {
  return (
    <TableRow>
      <TableCell style={{minWidth: 240}}>
        <Select displayEmpty value={row.part || ''} onChange={e => onChange(index, { ...row, part: e.target.value || '' })} style={{minWidth: 220}}>
          <MenuItem value="">(free text)</MenuItem>
          {parts.map(p => (
            <MenuItem key={p._id} value={p._id}>{p.internalSku} — {p.name}</MenuItem>
          ))}
        </Select>
      </TableCell>
      <TableCell><TextField label="Part Name" value={row.partName || ''} onChange={e=>onChange(index, { ...row, partName: e.target.value })} /></TableCell>
      <TableCell><TextField label="Part No." value={row.partNo || ''} onChange={e=>onChange(index, { ...row, partNo: e.target.value })} /></TableCell>
      <TableCell style={{width:110}}><TextField type="number" label="Qty" value={row.qty ?? 1} onChange={e=>onChange(index, { ...row, qty: Number(e.target.value) })} /></TableCell>
      <TableCell style={{width:120}}><TextField label="Unit" value={row.unit || 'ea'} onChange={e=>onChange(index, { ...row, unit: e.target.value })} /></TableCell>
      <TableCell><TextField label="Notes" value={row.notes || ''} onChange={e=>onChange(index, { ...row, notes: e.target.value })} /></TableCell>
      <TableCell style={{width:90}}><Button color="error" variant="outlined" onClick={()=>onRemove(index)}>Delete</Button></TableCell>
    </TableRow>
  );
}

const JOB_STATUS_LABELS = {
  investigate_quote: 'Investigate / Quote',
  quoted: 'Quoted',
  po_received: 'PO Received',
  awaiting_parts: 'Awaiting Parts',
  parts_received: 'Parts Received',
  require_plan_date: 'Require Plan Date',
  planned: 'Planned',
  in_progress: 'In Progress',
  invoice: 'Invoice'
};

export default function AssetDetailPage(){
  const { id } = useParams();
  const [asset, setAsset] = useState(null);
  const [parts, setParts] = useState([]);
  const [bom, setBom] = useState([]);
  const [attachments, setAttachments] = useState([]);

  // Jobs
  const [jobs, setJobs] = useState([]);
  const [jobStatuses, setJobStatuses] = useState([]);
  const [jobForm, setJobForm] = useState({
    jobNumber:'', poNumber:'', title:'', description:'',
    startDate:'', quoteDueDate:'', status:'investigate_quote'
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState(0);

  const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

  async function refreshJobs(){
    // filter jobs by this asset id via query param
    const out = await listJobsGlobal({ asset: id, limit: 50 });
    setJobs(out.items || []);
    setJobStatuses(out.statuses || []);
  }

  useEffect(() => {
    (async () => {
      const a = await getAsset(id);
      setAsset(a);
      setBom(a.bom || []);
      const lp = await listParts({});
      setParts(lp.items || []);
      const att = await listAssetAttachments(id);
      setAttachments(att || []);
      await refreshJobs();
    })();
  }, [id]);

  function addLine(){ setBom([...(bom || []), { part: '', partName: '', partNo: '', qty: 1, unit: 'ea', notes: '' }]); }
  function updateLine(idx, row){ const next = [...bom]; next[idx] = row; setBom(next); }
  function removeLine(idx){ const next = [...bom]; next.splice(idx, 1); setBom(next); }

  async function saveBom(){
    setSaving(true); setMsg('');
    try{
      const clean = (bom||[]).map(b => ({
        part: b.part || undefined,
        partName: b.partName || '',
        partNo: b.partNo || '',
        qty: Number(b.qty || 1),
        unit: b.unit || 'ea',
        notes: b.notes || ''
      }));
      const updated = await updateAsset(id, { bom: clean });
      setAsset(updated); setBom(updated.bom || []);
      setMsg('BOM saved ✓');
    }catch(e){ setMsg(e.response?.data?.error || e.message); }
    finally{ setSaving(false); }
  }

  async function onUploadFile(file){
    if(!file) return;
    await uploadAssetAttachment(id, file);
    setAttachments(await listAssetAttachments(id));
  }
  async function onDeleteFile(filename){
    await deleteAssetAttachment(id, filename);
    setAttachments(await listAssetAttachments(id));
    setAsset(await getAsset(id));
  }
  async function onSetMain(filename){
    await setMainPhoto(id, filename);
    setAsset(await getAsset(id));
  }

  // --- Jobs tab helpers ---
  async function createJobForAsset(e){
    e?.preventDefault?.();
    if(!asset?.client){ alert('Asset has no client'); return; }

    const payload = {
      jobNumber: jobForm.jobNumber,
      poNumber: jobForm.poNumber || '',
      client: asset.client,                       // bind to asset's client
      location: asset.location || null,           // bind to asset's location if present
      asset: asset._id,                           // bind to this asset
      title: jobForm.title,
      description: jobForm.description || '',
      startDate: jobForm.startDate || null,
      quoteDueDate: jobForm.quoteDueDate || null,
      status: jobForm.status || 'investigate_quote'
    };

    await createJobGlobal(payload);
    setJobForm({ jobNumber:'', poNumber:'', title:'', description:'', startDate:'', quoteDueDate:'', status:'investigate_quote' });
    await refreshJobs();
  }

  async function quickStatus(jobId, nextStatus){
    const updated = await updateJobGlobal(jobId, { status: nextStatus });
    // put it back into list
    setJobs(jobs.map(j => j._id === updated._id ? updated : j));
  }

  async function deleteJob(jobId){
    await deleteJobGlobal(jobId);
    setJobs(jobs.filter(j =>
