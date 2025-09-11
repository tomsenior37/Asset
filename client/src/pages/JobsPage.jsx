import React, { useEffect, useState } from 'react';
import {
  listJobsGlobal, createJobGlobal, listClients, getLocationTree, listAssets, createAssetQuick
} from '../services/api';
import {
  Table, TableHead, TableRow, TableCell, TableBody,
  TextField, Button, Select, MenuItem, Chip, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { Link } from 'react-router-dom';

const STATUS_LABELS = {
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

export default function JobsPage(){
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [locations, setLocations] = useState([]);
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1, statuses: [] });

  const [newJob, setNewJob] = useState({
    jobNumber: '', poNumber: '',
    location: '', asset: '',
    title: '', description: '',
    startDate: '', quoteDueDate: '',
    status: 'investigate_quote'
  });

  // inline asset modal
  const [assetModal, setAssetModal] = useState(false);
  const [assetForm, setAssetForm] = useState({ name:'', tag:'', category:'', model:'', serial:'', notes:'' });

  async function refresh(page=1){
    const out = await listJobsGlobal({ q, status, page, limit: 50, client: clientId || undefined });
    setData(out);
  }

  useEffect(() => { (async()=>{
    const cs = await listClients(); setClients(cs);
    if (cs.length) setClientId(cs[0]._id);
  })(); }, []);

  useEffect(() => { (async()=>{
    if (!clientId) return;
    const tree = await getLocationTree(clientId);
    const flat = [];
    const walk = (n, depth=0) => { flat.push({ _id:n._id, label: '—'.repeat(depth)+n.name }); (n.children||[]).forEach(c=>walk(c, depth+1)); };
    tree.forEach(r=>walk(r));
    setLocations(flat);
    refresh(1);
  })(); }, [clientId, q, status]);

  async function onCreate(e){
    e.preventDefault();
    const payload = {
      ...newJob,
      client: clientId,
      location: newJob.location || null,
      asset: newJob.asset || null,
      startDate: newJob.startDate || null,
      quoteDueDate: newJob.quoteDueDate || null
    };
    await createJobGlobal(payload);
    setNewJob({ jobNumber:'', poNumber:'', location:'', asset:'', title:'', description:'', startDate:'', quoteDueDate:'', status:'investigate_quote' });
    refresh(1);
  }

  async function openAssetModal(){
    if (!clientId || !newJob.location){
      alert('Pick Client and Location first.');
      return;
    }
    setAssetForm({ name:'', tag:'', category:'', model:'', serial:'', notes:'' });
    setAssetModal(true);
  }

  async function createAssetInline(){
    if (!assetForm.name) { alert('Asset name required'); return; }
    const payload = {
      client: clientId,
      location: newJob.location,
      name: assetForm.name,
      tag: assetForm.tag || '',
      category: assetForm.category || '',
      model: assetForm.model || '',
      serial: assetForm.serial || '',
      notes: assetForm.notes || ''
    };
    const made = await createAssetQuick(payload);
    // assign new asset to job form
    setNewJob({...newJob, asset: made._id});
    setAssetModal(false);
  }

  return (
    <div>
      {/* Filters */}
      <div className="card">
        <h2>Jobs</h2>
        <div className="row" style={{flexWrap:'wrap', gap:12}}>
          <Select value={clientId} onChange={e=>setClientId(e.target.value)}>
            {clients.map(c => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
          </Select>
          <Select displayEmpty value={status} onChange={e=>setStatus(e.target.value)}>
            <MenuItem value=""><em>All statuses</em></MenuItem>
            {(data.statuses||[]).map(s => <MenuItem key={s} value={s}>{STATUS_LABELS[s]}</MenuItem>)}
          </Select>
          <TextField label="Search (Job#/PO/Title/Desc)" value={q} onChange={e=>setQ(e.target.value)} />
          <Button variant="outlined" onClick={()=>refresh(1)}>Apply</Button>
        </div>
      </div>

      {/* New Job */}
      <div className="card">
        <h3>New Job (RCS → Investigate/Quote)</h3>
        <form onSubmit={onCreate}>
          <div className="row" style={{flexWrap:'wrap', gap:12}}>
            <TextField label="Job Number (5 digits)" value={newJob.jobNumber} onChange={e=>setNewJob({...newJob, jobNumber:e.target.value})}/>
            <TextField label="PO Number" value={newJob.poNumber} onChange={e=>setNewJob({...newJob, poNumber:e.target.value})}/>

            <Select displayEmpty value={newJob.location} onChange={e=>setNewJob({...newJob, location:e.target.value})} style={{minWidth:280}}>
              <MenuItem value=""><em>(No location)</em></MenuItem>
              {locations.map(l => <MenuItem key={l._id} value={l._id}>{l.label}</MenuItem>)}
            </Select>

            <TextField label="Asset ID (optional)" value={newJob.asset} onChange={e=>setNewJob({...newJob, asset:e.target.value})}/>
            <Button type="button" variant="outlined" onClick={openAssetModal}>Create Asset</Button>

            <TextField label="Title" value={newJob.title} onChange={e=>setNewJob({...newJob, title:e.target.value})}/>
            <TextField label="Start date (from RCS)" type="date" InputLabelProps={{shrink:true}} value={newJob.startDate} onChange={e=>setNewJob({...newJob, startDate:e.target.value})}/>
            <TextField label="Quote due date" type="date" InputLabelProps={{shrink:true}} value={newJob.quoteDueDate} onChange={e=>setNewJob({...newJob, quoteDueDate:e.target.value})}/>
          </div>
          <TextField label="Description of work (copy from RCS)" fullWidth multiline minRows={3} value={newJob.description} onChange={e=>setNewJob({...newJob, description:e.target.value})}/>
          <Button variant="contained" type="submit" style={{marginTop:8}}>Create</Button>
        </form>
      </div>

      {/* Jobs table */}
      <div className="card">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Job #</TableCell>
              <TableCell>PO #</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Updated</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.items.map(j => (
              <TableRow key={j._id}>
                <TableCell><Link to={`/jobs/${j._id}`}>{j.jobNumber}</Link></TableCell>
                <TableCell>{j.poNumber}</TableCell>
                <TableCell>{j.title}</TableCell>
                <TableCell><Chip size="small" label={STATUS_LABELS[j.status]}/></TableCell>
                <TableCell>{j.client?.name}</TableCell>
                <TableCell>{new Date(j.updatedAt).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Inline Asset Modal */}
      <Dialog open={assetModal} onClose={()=>setAssetModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Asset (inline)</DialogTitle>
        <DialogContent>
          <div className="row" style={{flexWrap:'wrap', gap:12}}>
            <TextField label="Name" fullWidth value={assetForm.name} onChange={e=>setAssetForm({...assetForm, name:e.target.value})}/>
            <TextField label="Tag" value={assetForm.tag} onChange={e=>setAssetForm({...assetForm, tag:e.target.value})}/>
            <TextField label="Category" value={assetForm.category} onChange={e=>setAssetForm({...assetForm, category:e.target.value})}/>
            <TextField label="Model" value={assetForm.model} onChange={e=>setAssetForm({...assetForm, model:e.target.value})}/>
            <TextField label="Serial" value={assetForm.serial} onChange={e=>setAssetForm({...assetForm, serial:e.target.value})}/>
            <TextField label="Notes" fullWidth multiline minRows={2} value={assetForm.notes} onChange={e=>setAssetForm({...assetForm, notes:e.target.value})}/>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setAssetModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={createAssetInline}>Create</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
