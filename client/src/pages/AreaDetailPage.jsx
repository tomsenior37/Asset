import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { listClients, getLocationTree, listAssets, createAsset } from '../services/api';
import { Table, TableBody, TableCell, TableHead, TableRow, TextField, Button } from '@mui/material';

export default function AreaDetailPage(){
  const { id: areaId } = useParams();
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [site, setSite] = useState(null);
  const [area, setArea] = useState(null);
  const [assets, setAssets] = useState([]);
  const [form, setForm] = useState({ name:'', tag:'', category:'', model:'', serial:'' });

  async function resolveArea(){
    const cs = await listClients();
    for (const c of cs){
      const tree = await getLocationTree(c._id);
      let found=null, parent=null;
      const walk = (n, p=null)=>{ if(n._id===areaId){ found=n; parent=p; } (n.children||[]).forEach(ch=>walk(ch, n)); };
      tree.forEach(r=>walk(r, null));
      if(found){
        setClientId(c._id); setClientName(c.name); setArea(found); setSite(parent);
        return;
      }
    }
  }

  async function refreshAssets(){
    if(!clientId) return;
    const out = await listAssets({ client: clientId, location: areaId, limit: 200 });
    setAssets(out.items || []);
  }

  useEffect(() => { (async()=>{ await resolveArea(); })(); }, [areaId]);
  useEffect(() => { if(clientId) refreshAssets(); }, [clientId]);

  async function onCreate(e){
    e.preventDefault();
    if(!clientId || !areaId || !form.name) return;
    await createAsset({ client: clientId, location: areaId, ...form });
    setForm({ name:'', tag:'', category:'', model:'', serial:'' });
    refreshAssets();
  }

  if(!area) return <div className="card"><p>Loading…</p></div>;

  return (
    <div>
      <div className="card">
        <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <h2 style={{margin:0}}>Area: {area.name}</h2>
          <div className="row" style={{gap:8}}>
            {site && <Link to={`/sites/${site._id}`}><Button variant="outlined">← Back to Site</Button></Link>}
          </div>
        </div>
        <div style={{marginTop:6}}>
          <small>Client:</small> <strong>{clientName}</strong> &nbsp;•&nbsp;
          {site && <><small>Site:</small> <strong>{site.name}</strong> &nbsp;•&nbsp;</>}
          <small>Code:</small> <strong>{area.code}</strong>
        </div>
      </div>

      <div className="card">
        <h3>Assets in this area</h3>
        <form onSubmit={onCreate}>
          <div className="row" style={{gap:12, flexWrap:'wrap'}}>
            <TextField label="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
            <TextField label="Tag" value={form.tag} onChange={e=>setForm({...form, tag:e.target.value})}/>
            <TextField label="Category" value={form.category} onChange={e=>setForm({...form, category:e.target.value})}/>
            <TextField label="Model" value={form.model} onChange={e=>setForm({...form, model:e.target.value})}/>
            <TextField label="Serial" value={form.serial} onChange={e=>setForm({...form, serial:e.target.value})}/>
            <Button variant="contained" type="submit">Add Asset</Button>
          </div>
        </form>

        <Table style={{marginTop:12}}>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell><TableCell>Tag</TableCell><TableCell>Model</TableCell><TableCell>Serial</TableCell><TableCell>Category</TableCell><TableCell>Status</TableCell><TableCell>Open</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assets.map(a => (
              <TableRow key={a._id}>
                <TableCell>{a.name}</TableCell>
                <TableCell>{a.tag}</TableCell>
                <TableCell>{a.model}</TableCell>
                <TableCell>{a.serial}</TableCell>
                <TableCell>{a.category}</TableCell>
                <TableCell>{a.status}</TableCell>
                <TableCell><Link to={`/assets/${a._id}`}><Button variant="outlined" size="small">Open</Button></Link></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!assets.length && <p><em>No assets yet.</em></p>}
      </div>
    </div>
  );
}
