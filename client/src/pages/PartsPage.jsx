import React, { useEffect, useState } from 'react';
import { listParts, createPart, listSuppliers } from '../services/api';
import { Table, TableBody, TableCell, TableHead, TableRow, TextField, Button } from '@mui/material';
import { useAuth } from '../AuthContext.jsx';
import { Link } from 'react-router-dom';

export default function PartsPage(){
  const { isAdmin } = useAuth();
  const [data, setData] = useState({ items: [], total: 0 });
  const [q, setQ] = useState('');
  const [suppliers, setSuppliers] = useState([]);

  const [form, setForm] = useState({
    internalSku: '',
    name: '',
    unit: '',
    category: '',
    supplierOptions: [],
    internal: { onHand: 0, standardCost: 0, reorderPoint: 0, reorderQty: 0 },
    notes: ''
  });

  async function refresh(){
    const out = await listParts({ q });
    setData(out);
  }

  useEffect(() => { refresh(); }, [q]);
  useEffect(() => { (async()=>{ setSuppliers(await listSuppliers()); })(); }, []);

  function addSupplierOpt(){
    setForm({...form, supplierOptions: [...(form.supplierOptions||[]), { supplier: '', supplierSku: '', price:0, currency:'USD', leadTimeDays:0, moq:1, preferred:false }]});
  }

  async function onCreate(e){
    e.preventDefault();
    await createPart(form);
    setForm({
      internalSku:'', name:'', unit:'', category:'',
      supplierOptions: [],
      internal: { onHand: 0, standardCost: 0, reorderPoint: 0, reorderQty: 0 },
      notes: ''
    });
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
              <TableCell>SKU</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell>Suppliers</TableCell>
              <TableCell>On hand</TableCell>
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
                <TableCell>{p.internal?.onHand ?? 0}</TableCell>
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
              <TextField label="Category" value={form.category} onChange={e=>setForm({...form, category:e.target.value})} />
              <TextField label="Unit" value={form.unit} onChange={e=>setForm({...form, unit:e.target.value})} />
              <TextField label="On hand" type="number" value={form.internal.onHand} onChange={e=>setForm({...form, internal:{...form.internal, onHand:Number(e.target.value)}})} />
              <Button variant="outlined" onClick={addSupplierOpt}>+Supplier</Button>
            </div>

            {(form.supplierOptions||[]).map((opt, idx) => (
              <div key={idx} className="row">
                <TextField label="Supplier ID" value={opt.supplier||''} onChange={e=>{
                  const arr=[...form.supplierOptions]; arr[idx]={...arr[idx], supplier:e.target.value}; setForm({...form, supplierOptions:arr});
                }}/>
                <TextField label="Supplier SKU" value={opt.supplierSku||''} onChange={e=>{
                  const arr=[...form.supplierOptions]; arr[idx]={...arr[idx], supplierSku:e.target.value}; setForm({...form, supplierOptions:arr});
                }}/>
                <TextField label="Price" type="number" value={opt.price||0} onChange={e=>{
                  const arr=[...form.supplierOptions]; arr[idx]={...arr[idx], price:Number(e.target.value)}; setForm({...form, supplierOptions:arr});
                }}/>
                <TextField label="Currency" value={opt.currency||'USD'} onChange={e=>{
                  const arr=[...form.supplierOptions]; arr[idx]={...arr[idx], currency:e.target.value}; setForm({...form, supplierOptions:arr});
                }}/>
                <TextField label="Lead (days)" type="number" value={opt.leadTimeDays||0} onChange={e=>{
                  const arr=[...form.supplierOptions]; arr[idx]={...arr[idx], leadTimeDays:Number(e.target.value)}; setForm({...form, supplierOptions:arr});
                }}/>
                <TextField label="MOQ" type="number" value={opt.moq||1} onChange={e=>{
                  const arr=[...form.supplierOptions]; arr[idx]={...arr[idx], moq:Number(e.target.value)}; setForm({...form, supplierOptions:arr});
                }}/>
              </div>
            ))}
            <div className="row">
              <TextField label="Std Cost" type="number" value={form.internal.standardCost} onChange={e=>setForm({...form, internal:{...form.internal, standardCost:Number(e.target.value)}})} />
              <TextField label="Reorder Point" type="number" value={form.internal.reorderPoint} onChange={e=>setForm({...form, internal:{...form.internal, reorderPoint:Number(e.target.value)}})} />
              <TextField label="Reorder Qty" type="number" value={form.internal.reorderQty} onChange={e=>setForm({...form, internal:{...form.internal, reorderQty:Number(e.target.value)}})} />
            </div>
            <Button variant="contained" type="submit">Create</Button>
          </form>
        </div>
      )}
    </div>
  );
}
