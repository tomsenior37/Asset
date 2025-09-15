import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getSupplier, updateSupplier, listSupplierParts,
  listParts, linkSupplierToPart, unlinkSupplierFromPart
} from '../services/api';
import {
  Tabs, Tab, TextField, Button, Table, TableHead, TableBody, TableCell, TableRow, Select, MenuItem
} from '@mui/material';
import { useAuth } from '../AuthContext.jsx';

export default function SupplierDetailPage(){
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const [s, setS] = useState(null);
  const [tab, setTab] = useState(0);

  const [form, setForm] = useState({});
  const [linkedParts, setLinkedParts] = useState([]);

  // linking form
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [linkForm, setLinkForm] = useState({
    partId: '',
    supplierSku: '',
    price: 0,
    currency: 'USD',
    leadTimeDays: 0,
    moq: 1,
    preferred: false
  });

  async function refreshLinked(){ setLinkedParts(await listSupplierParts(id, { linked: true })); }

  useEffect(() => { (async()=>{
    const sup = await getSupplier(id);
    setS(sup); setForm(sup);
    await refreshLinked();
  })(); }, [id]);

  async function save(){
    const payload = {
      name: form.name || '',
      code: form.code || '',
      email: form.email || '',
      phone: form.phone || '',
      website: form.website || '',
      address: form.address || '',
      notes: form.notes || ''
    };
    const out = await updateSupplier(id, payload);
    setS(out);
    setForm(out);
  }

  async function searchUnlinked(q){
    setQuery(q);
    if (!q || q.length < 2) { setCandidates([]); return; }
    const res = await listParts({ q });
    // filter out parts already linked to this supplier
    const lp = await listSupplierParts(id, { linked: true });
    const linkedIds = new Set(lp.map(p => String(p._id)));
    const filtered = (res.items || []).filter(p => !linkedIds.has(String(p._id)));
    setCandidates(filtered);
  }

  async function doLink(){
    if (!linkForm.partId) return;
    await linkSupplierToPart(id, linkForm);
    // reset and refresh
    setLinkForm({ partId:'', supplierSku:'', price:0, currency:'USD', leadTimeDays:0, moq:1, preferred:false });
    setCandidates([]); setQuery('');
    await refreshLinked();
  }

  async function doUnlink(partId){
    await unlinkSupplierFromPart(id, partId);
    await refreshLinked();
  }

  if(!s) return <div className="card"><p>Loading…</p></div>;

  return (
    <div>
      <div className="card">
        <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <h2 style={{margin:0}}>Supplier: {s.name} <span style={{fontSize:14, color:'#777'}}>({s.code})</span></h2>
          <Link to="/suppliers"><Button variant="outlined">← Back to Suppliers</Button></Link>
        </div>
      </div>

      <Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{mb:1}}>
        <Tab label="Overview" />
        <Tab label="Parts" />
      </Tabs>

      {tab===0 && (
        <div className="card">
          <div className="row"><TextField label="Name" value={form.name||''} onChange={e=>setForm({...form, name:e.target.value})}/><TextField label="Code" value={form.code||''} onChange={e=>setForm({...form, code:e.target.value})}/></div>
          <div className="row"><TextField label="Email" value={form.email||''} onChange={e=>setForm({...form, email:e.target.value})}/><TextField label="Phone" value={form.phone||''} onChange={e=>setForm({...form, phone:e.target.value})}/></div>
          <div className="row"><TextField label="Website" value={form.website||''} onChange={e=>setForm({...form, website:e.target.value})}/></div>
          <TextField label="Address" fullWidth value={form.address||''} onChange={e=>setForm({...form, address:e.target.value})}/>
          <TextField label="Notes" fullWidth multiline minRows={3} value={form.notes||''} onChange={e=>setForm({...form, notes:e.target.value})}/>
          {isAdmin && <div style={{marginTop:8}}><Button variant="contained" onClick={save}>Save</Button></div>}
        </div>
      )}

      {tab===1 && (
        <div className="card">
          <h3>Linked Parts</h3>
          {!linkedParts.length && <p><em>No parts reference this supplier yet.</em></p>}
          {!!linkedParts.length && (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>SKU</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {linkedParts.map(p => (
                  <TableRow key={p._id}>
                    <TableCell>{p.internalSku}</TableCell>
                    <TableCell><Link to={`/parts/${p._id}`}>{p.name}</Link></TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell>
                      {isAdmin && <Button size="small" color="error" variant="outlined" onClick={()=>doUnlink(p._id)}>Unlink</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {isAdmin && (
            <>
              <h3 style={{marginTop:20}}>Link a new Part</h3>
              <div className="row" style={{alignItems:'flex-end'}}>
                <TextField label="Search parts…" value={query} onChange={e=>searchUnlinked(e.target.value)} />
                <Select displayEmpty value={linkForm.partId} onChange={e=>setLinkForm({...linkForm, partId:e.target.value})} style={{minWidth:280}}>
                  <MenuItem value=""><em>Pick part…</em></MenuItem>
                  {candidates.map(p => <MenuItem key={p._id} value={p._id}>{p.internalSku} — {p.name}</MenuItem>)}
                </Select>
                <TextField label="Supplier SKU" value={linkForm.supplierSku} onChange={e=>setLinkForm({...linkForm, supplierSku:e.target.value})}/>
                <TextField label="Price" type="number" value={linkForm.price} onChange={e=>setLinkForm({...linkForm, price:Number(e.target.value)})}/>
                <TextField label="Currency" value={linkForm.currency} onChange={e=>setLinkForm({...linkForm, currency:e.target.value})}/>
                <TextField label="Lead (days)" type="number" value={linkForm.leadTimeDays} onChange={e=>setLinkForm({...linkForm, leadTimeDays:Number(e.target.value)})}/>
                <TextField label="MOQ" type="number" value={linkForm.moq} onChange={e=>setLinkForm({...linkForm, moq:Number(e.target.value)})}/>
                <Select value={linkForm.preferred ? 'yes' : 'no'} onChange={e=>setLinkForm({...linkForm, preferred: e.target.value === 'yes'})}>
                  <MenuItem value="no">no</MenuItem>
                  <MenuItem value="yes">yes</MenuItem>
                </Select>
                <Button variant="contained" onClick={doLink}>Link</Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
