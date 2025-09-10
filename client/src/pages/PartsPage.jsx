import React, { useEffect, useState } from 'react';
import { listParts, createPart, listSuppliers, listClients, getLocationTree } from '../services/api';
import { Table, TableBody, TableCell, TableHead, TableRow, TextField, Button, Select, MenuItem } from '@mui/material';
import { useAuth } from '../AuthContext.jsx';
import { Link } from 'react-router-dom';

export default function PartsPage(){
  const { isAdmin } = useAuth();
  const [data, setData] = useState({ items: [], total: 0 });
  const [q, setQ] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [clients, setClients] = useState([]);
  const [sites, setSites] = useState([]);

  const [form, setForm] = useState({
    internalSku: '',
    name: '',
    unit: '',
    supplierOptions: [],
    internal: { standardCost: 0, stockBySite: [] }
  });

  async function refresh(){
    const out = await listParts({ q });
    setData(out);
  }

  useEffect(() => { refresh(); }, [q]);
  useEffect(() => { (async()=>{ setSuppliers(await listSuppliers()); setClients(await listClients()); })(); }, []);

  async function onPickClient(clientId){
    const tree = await getLocationTree(clientId);
    const flat = [];
    const walk = (n) => { if(n.kind === 'site') flat.push(n); (n.children||[]).forEach(walk); };
    tree.forEach(walk);
    setSites(flat);
  }

  function addSupplierOpt(){
    setForm({...form, supplierOptions: [...(form.supplierOptions||[]), { supplier: '', supplierSku: '' }]});
  }
  function addStockSite(siteId){
    const found = sites.find(s => s._id === siteId);
    if(!found) return;
    setForm({...form, internal: { ...(form.internal||{}), stockBySite: [...(form.internal?.stockBySite||[]), { site: siteId, qty: 0 }] }});
  }

  async function onCreate(e){
    e.preventDefault();
    await createPart(form);
    setForm({ internalSku:'', name:'', unit:'', supplierOptions:[], internal:{ standardCost:0, stockBySite:[] } });
    refresh();
  }

  return (
    <div>
      <div className="card">
        <h2>Parts</h2>
        <div className="row">
          <TextField label="Search" value={q} onChange={e=>setQ(e.target.value)} />
        </div>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>SKU</TableCell><TableCell>Name</TableCell><TableCell>Category</TableCell><TableCell>Unit</TableCell><TableCell>Suppliers</TableCell><TableCell>Stock (sites)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.items.map(p => (
              <TableRow key={p._id}>
                <TableCell>{p.internalSku}</TableCell>
                <TableCell><Link to={`/parts/${p._id}`}>{p.name}</Link></TableCell>
                <TableCell>{p.category}</TableCell>
                <TableCell>{p.unit}</TableCell>
                <TableCell>{(p.supplierOptions||[]).map(s=>s.supplierSku || s.supplier).join(', ')}</TableCell>
                <TableCell>{(p.internal?.stockBySite||[]).reduce((a,b)=>a + b.qty,0)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {isAdmin && (
        <div className="card">
          <h2>New Part (admin)</h2>
          <form onSubmit={onCreate}>
            <div className="row">
              <TextField label="Internal SKU" value={form.internalSku} onChange={e=>setForm({...form, internalSku:e.target.value})} />
              <TextField label="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
              <TextField label="Unit" value={form.unit} onChange={e=>setForm({...form, unit:e.target.value})} />
              <Button variant="outlined" onClick={addSupplierOpt}>+Supplier</Button>
              <Select displayEmpty value="" onChange={e=>onPickClient(e.target.value)}><MenuItem value="">Pick client (for sites)</MenuItem>{clients.map(c=><MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}</Select>
              <Select displayEmpty value="" onChange={e=>addStockSite(e.target.value)}><MenuItem value="">Add site for stock</MenuItem>{sites.map(s=><MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>)}</Select>
              <Button variant="contained" type="submit">Create</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
