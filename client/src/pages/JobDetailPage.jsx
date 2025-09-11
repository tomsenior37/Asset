import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getJob, updateJobGlobal, addJobResource, updateJobResource, deleteJobResource
} from '../services/api';
import {
  Tabs, Tab, TextField, Select, MenuItem, Button, Table, TableHead, TableRow, TableCell, TableBody
} from '@mui/material';

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

export default function JobDetailPage(){
  const { id } = useParams();
  const [tab, setTab] = useState(0);
  const [job, setJob] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [form, setForm] = useState({});
  const [resForm, setResForm] = useState({ person:'', role:'', hours:0, date:'', notes:'' });

  async function load(){
    const { job: j, statuses: st } = await getJob(id);
    setJob(j); setStatuses(st);
    setForm({
      jobNumber: j.jobNumber, poNumber: j.poNumber, title: j.title,
      description: j.description, startDate: j.startDate ? j.startDate.slice(0,10) : '',
      status: j.status
    });
  }
  useEffect(()=>{ load(); }, [id]);

  async function saveOverview(){
    const payload = {
      jobNumber: form.jobNumber, poNumber: form.poNumber, title: form.title,
      description: form.description, status: form.status,
      startDate: form.startDate || null
    };
    const updated = await updateJobGlobal(id, payload);
    setJob(updated);
  }

  async function addResource(){
    const payload = {
      person: resForm.person, role: resForm.role, hours: Number(resForm.hours||0),
      date: resForm.date || null, notes: resForm.notes || ''
    };
    const updated = await addJobResource(id, payload);
    setJob(updated);
    setResForm({ person:'', role:'', hours:0, date:'', notes:'' });
  }

  async function editResource(rid, patch){
    const updated = await updateJobResource(id, rid, patch);
    setJob(updated);
  }

  async function removeResource(rid){
    const updated = await deleteJobResource(id, rid);
    setJob(updated);
  }

  if(!job) return <div className="card"><p>Loading…</p></div>;

  return (
    <div>
      <div className="card">
        <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <h2 style={{margin:0}}>Job: {job.jobNumber}</h2>
          <div className="row" style={{gap:8}}>
            {job.client && <Link to={`/clients/${job.client._id}`}><Button variant="outlined">Client</Button></Link>}
            {job.asset && <Link to={`/assets/${job.asset._id}`}><Button variant="outlined">Asset</Button></Link>}
            <Link to="/jobs"><Button variant="outlined">← Back to Jobs</Button></Link>
          </div>
        </div>
      </div>

      <Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{mb:1}}>
        <Tab label="Overview" />
        <Tab label="Resources" />
      </Tabs>

      {tab===0 && (
        <div className="card">
          <div className="row" style={{flexWrap:'wrap', gap:12}}>
            <TextField label="Job Number" value={form.jobNumber||''} onChange={e=>setForm({...form, jobNumber:e.target.value})}/>
            <TextField label="PO Number" value={form.poNumber||''} onChange={e=>setForm({...form, poNumber:e.target.value})}/>
            <Select value={form.status||'investigate_quote'} onChange={e=>setForm({...form, status:e.target.value})}>
              {statuses.map(s => <MenuItem key={s} value={s}>{STATUS_LABELS[s]}</MenuItem>)}
            </Select>
            <TextField label="Start date" type="date" InputLabelProps={{shrink:true}} value={form.startDate||''} onChange={e=>setForm({...form, startDate:e.target.value})}/>
          </div>
          <TextField label="Title" fullWidth value={form.title||''} onChange={e=>setForm({...form, title:e.target.value})}/>
          <TextField label="Description of work" fullWidth multiline minRows={4} value={form.description||''} onChange={e=>setForm({...form, description:e.target.value})}/>
          <Button variant="contained" onClick={saveOverview} style={{marginTop:8}}>Save</Button>
        </div>
      )}

      {tab===1 && (
        <div className="card">
          <h3>Add Resource</h3>
          <div className="row" style={{flexWrap:'wrap', gap:12}}>
            <TextField label="Person" value={resForm.person} onChange={e=>setResForm({...resForm, person:e.target.value})}/>
            <TextField label="Role" value={resForm.role} onChange={e=>setResForm({...resForm, role:e.target.value})}/>
            <TextField label="Hours" type="number" value={resForm.hours} onChange={e=>setResForm({...resForm, hours:e.target.value})}/>
            <TextField label="Date" type="date" InputLabelProps={{shrink:true}} value={resForm.date} onChange={e=>setResForm({...resForm, date:e.target.value})}/>
            <TextField label="Notes" value={resForm.notes} onChange={e=>setResForm({...resForm, notes:e.target.value})}/>
            <Button variant="contained" onClick={addResource}>Add</Button>
          </div>

          <h3 style={{marginTop:16}}>Resources</h3>
          {!job.resources?.length && <p><em>No resources yet.</em></p>}
          {!!job.resources?.length && (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Person</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Hours</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {job.resources.map(r => (
                  <TableRow key={r._id}>
                    <TableCell>{r.person}</TableCell>
                    <TableCell>{r.role}</TableCell>
                    <TableCell>{r.hours}</TableCell>
                    <TableCell>{r.date ? new Date(r.date).toLocaleDateString() : '—'}</TableCell>
                    <TableCell>{r.notes||''}</TableCell>
                    <TableCell>
                      <div className="row" style={{gap:8}}>
                        <Button size="small" variant="outlined" onClick={()=>editResource(r._id, { hours: Number(r.hours||0) + 1 })}>+1 hr</Button>
                        <Button size="small" color="error" variant="outlined" onClick={()=>removeResource(r._id)}>Delete</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}
