import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getClient, updateClient } from '../services/api';
import { TextField, Button, Grid, Paper } from '@mui/material';
import { useAuth } from '../AuthContext.jsx';

export default function ClientDetailPage(){
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const [c, setC] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => {
    (async () => {
      const x = await getClient(id);
      setC(x);
      setForm(x);
    })();
  }, [id]);

  async function save(){
    const payload = {
      name: form.name || '',
      code: form.code || '',
      notes: form.notes || '',
      addressLine1: form.addressLine1 || '',
      addressLine2: form.addressLine2 || '',
      city: form.city || '',
      state: form.state || '',
      postcode: form.postcode || '',
      country: form.country || '',
      contactName: form.contactName || '',
      phone: form.phone || '',
      email: form.email || '',
      website: form.website || '',
    };
    const out = await updateClient(id, payload);
    setC(out);
    setForm(out);
  }

  if (!c) return <div className="card"><p>Loading…</p></div>;

  return (
    <div>
      <div className="card">
        <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <h2 style={{margin:0}}>Client: {c.name} <span style={{fontSize:14, color:'#777'}}>({c.code})</span></h2>
          <Link to="/"><Button variant="outlined">← Back to Clients</Button></Link>
        </div>
      </div>

      <div className="card">
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <h3>Address</h3>
            <TextField label="Address line 1" fullWidth margin="dense" value={form.addressLine1||''} onChange={e=>setForm({...form, addressLine1:e.target.value})}/>
            <TextField label="Address line 2" fullWidth margin="dense" value={form.addressLine2||''} onChange={e=>setForm({...form, addressLine2:e.target.value})}/>
            <div className="row">
              <TextField label="City" value={form.city||''} onChange={e=>setForm({...form, city:e.target.value})}/>
              <TextField label="State" value={form.state||''} onChange={e=>setForm({...form, state:e.target.value})}/>
              <TextField label="Postcode" value={form.postcode||''} onChange={e=>setForm({...form, postcode:e.target.value})}/>
            </div>
            <TextField label="Country" fullWidth margin="dense" value={form.country||''} onChange={e=>setForm({...form, country:e.target.value})}/>
          </Grid>

          <Grid item xs={12} md={6}>
            <h3>Contact</h3>
            <TextField label="Contact name" fullWidth margin="dense" value={form.contactName||''} onChange={e=>setForm({...form, contactName:e.target.value})}/>
            <TextField label="Phone" fullWidth margin="dense" value={form.phone||''} onChange={e=>setForm({...form, phone:e.target.value})}/>
            <TextField label="Email" fullWidth margin="dense" value={form.email||''} onChange={e=>setForm({...form, email:e.target.value})}/>
            <TextField label="Website" fullWidth margin="dense" value={form.website||''} onChange={e=>setForm({...form, website:e.target.value})}/>
          </Grid>

          <Grid item xs={12}>
            <h3>Notes</h3>
            <TextField label="Notes" fullWidth multiline minRows={3} value={form.notes||''} onChange={e=>setForm({...form, notes:e.target.value})}/>
          </Grid>
        </Grid>

        {isAdmin && <div style={{marginTop:12}}><Button variant="contained" onClick={save}>Save</Button></div>}
      </div>
    </div>
  );
}
