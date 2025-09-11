import React, { useEffect, useState } from 'react';
import { listSuppliers, createSupplier } from '../services/api';
import { Table, TableBody, TableCell, TableHead, TableRow, TextField, Button } from '@mui/material';
import { useAuth } from '../AuthContext.jsx';
import { Link } from 'react-router-dom';

export default function SuppliersPage(){
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', code: '' });

  async function refresh(){ setItems(await listSuppliers()); }
  useEffect(()=>{ refresh(); }, []);

  async function onCreate(e){
    e.preventDefault();
    await createSupplier(form);
    setForm({ name:'', code:'' });
    refresh();
  }

  return (
    <div>
      {isAdmin && (<div className="card">
        <h2>New Supplier (admin)</h2>
        <form onSubmit={onCreate}>
          <div className="row">
            <TextField label="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
            <TextField label="Code" value={form.code} onChange={e=>setForm({...form, code:e.target.value})} />
            <Button variant="contained" type="submit">Create</Button>
          </div>
        </form>
      </div>)}
      <div className="card">
        <h2>Suppliers</h2>
        <Table>
          <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Code</TableCell><TableCell>Created</TableCell></TableRow></TableHead>
          <TableBody>
            {items.map(s => (
              <TableRow key={s._id}>
                <TableCell><Link to={`/suppliers/${s._id}`}>{s.name}</Link></TableCell>
                <TableCell>{s.code}</TableCell>
                <TableCell>{new Date(s.createdAt).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
