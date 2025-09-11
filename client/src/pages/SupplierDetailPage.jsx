import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSupplier, updateSupplier, listSupplierParts } from '../services/api';
import { Tabs, Tab, TextField, Button, Table, TableHead, TableBody, TableCell, TableRow } from '@mui/material';
import { useAuth } from '../AuthContext.jsx';

export default function SupplierDetailPage(){
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const [s, setS] = useState(null);
  const [parts, setParts] = useState([]);
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState({});

  useEffect(() => { (async()=>{
    const _s = await getSupplier(id);
    setS(_s);
    setForm(_s);
    setParts(await listSupplierParts(id));
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
          {!parts.length && <p><em>No parts reference this supplier yet.</em></p>}
          {!!parts.length && (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>SKU</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {parts.map(p => (
                  <TableRow key={p._id}>
                    <TableCell>{p.internalSku}</TableCell>
                    <TableCell><Link to={`/parts/${p._id}`}>{p.name}</Link></TableCell>
                    <TableCell>{p.category}</TableCell>
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
