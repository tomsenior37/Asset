import React, { useEffect, useState } from 'react';
import { listJobsGlobal, createJobGlobal, listClients, getLocationTree, listAssets } from '../services/api';
import { Table, TableHead, TableRow, TableCell, TableBody, TextField, Button, Select, MenuItem, Chip } from '@mui/material';
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
    jobNumber: '', poNumber: '', client: '', location: '', asset: '', title: '', description: '', startDate: '', status: 'investigate_quote'
  });

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
    const payload = { ...newJob, client: clientId, location: newJob.location || null, asset: newJob.asset || null, startDate: newJob.startDate || null };
    await createJobGlobal(payload);
    setNewJob({ jobNumber:'', poNumber:'', client:'', location:'', asset:'', title:'', description:'', startDate:'', status:'investigate_quote' });
    refresh(1);
  }

  return (
    <div>
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
          <TextField label="Search (job # / PO / title / desc)" value={q} onChange={e=>setQ(e.target.value)} />
          <Button variant="outlined" onClick={()=>refresh(1)}>Apply</Button>
        </div>
      </div>

      <div className="card">
        <h3>New Job</h3>
        <form onSubmit={onCreate}>
          <div className="row" style={{flexWrap:'wrap', gap:12}}>
            <TextField label="Job Number" value={newJob.jobNumber} onChange={e=>setNewJob({...newJob, jobNumber:e.target.value})}/>
            <TextField label="PO Number" value={newJob.poNumber} onChange={e=>setNewJob({...newJob, poNumber:e.target.value})}/>
            <Select displayEmpty value={newJob.location} onChange={e=>setNewJob({...newJob, location:e.target.value})} style={{minWidth:220}}>
              <MenuItem value=""><em>(No location)</em></MenuItem>
              {locations.map(l => <MenuItem key={l._id} value={l._id}>{l.label}</MenuItem>)}
            </Select>
            <TextField label="Asset ID (optional)" value={newJob.asset} onChange={e=>setNewJob({...newJob, asset:e.target.value})}/>
            <TextField label="Title" value={newJob.title} onChange={e=>setNewJob({...newJob, title:e.target.value})}/>
            <TextField label="Start date" type="date" InputLabelProps={{shrink:true}} value={newJob.startDate} onChange={e=>setNewJob({...newJob, startDate:e.target.value})}/>
            <Select value={newJob.status} onChange={e=>setNewJob({...newJob, status:e.target.value})}>
              {(data.statuses||[]).map(s => <MenuItem key={s} value={s}>{STATUS_LABELS[s]}</MenuItem>)}
            </Select>
          </div>
          <TextField label="Description of work" fullWidth multiline minRows={3} value={newJob.description} onChange={e=>setNewJob({...newJob, description:e.target.value})}/>
          <Button variant="contained" type="submit" style={{marginTop:8}}>Create</Button>
        </form>
      </div>

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
    </div>
  );
}
