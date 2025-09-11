import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { listClients, getLocationTree, createLocation } from '../services/api';
import { Tabs, Tab, TextField, Button, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';

export default function SiteDetailPage(){
  const { id: siteId } = useParams();
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [site, setSite] = useState(null);
  const [areas, setAreas] = useState([]);
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState({ name:'', code:'' });
  const [q, setQ] = useState('');

  async function load(){
    // find client & site by traversing tree of each client (cheap enough for now)
    const cs = await listClients();
    for (const c of cs){
      const tree = await getLocationTree(c._id);
      let found = null;
      const walk = (n)=>{ if(n._id===siteId) found = n; (n.children||[]).forEach(walk); };
      tree.forEach(walk);
      if(found){
        setClientId(c._id); setClientName(c.name); setSite(found);
        const a=[]; const walkChildren=(n)=>{ if(n.kind==='area' && n.parent===siteId) a.push(n); (n.children||[]).forEach(walkChildren); };
        (found.children||[]).forEach(walkChildren);
        setAreas(a.sort((x,y)=>x.name.localeCompare(y.name)));
        break;
      }
    }
  }
  useEffect(()=>{ load(); }, [siteId]);

  async function addArea(e){
    e.preventDefault();
    if(!form.name || !form.code) return;
    await createLocation(clientId, { ...form, kind:'area', parent: siteId });
    setForm({ name:'', code:'' }); await load();
  }

  const filtered = areas.filter(a => !q || a.name.toLowerCase().includes(q.toLowerCase()) || a.code.toLowerCase().includes(q.toLowerCase()));

  if(!site) return <div className="card"><p>Loading…</p></div>;
  return (
    <div>
      <div className="card">
        <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <h2 style={{margin:0}}>Site: {site.name}</h2>
          <div className="row" style={{gap:8}}>
            <Link to={`/clients/${clientId}/locations`}><Button variant="outlined">← Back to Sites</Button></Link>
          </div>
        </div>
        <div style={{marginTop:6}}><small>Client:</small> <strong>{clientName}</strong> &nbsp;•&nbsp; <small>Code:</small> <strong>{site.code}</strong></div>
      </div>

      <Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{mb:1}}>
        <Tab label="Areas" />
      </Tabs>

      {tab===0 && (
        <div className="card">
          <h3>Areas</h3>
          <form onSubmit={addArea}>
            <div className="row" style={{gap:12, flexWrap:'wrap'}}>
              <TextField label="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
              <TextField label="Code" value={form.code} onChange={e=>setForm({...form, code:e.target.value})}/>
              <Button variant="contained" type="submit">Add Area</Button>
              <TextField label="Filter" value={q} onChange={e=>setQ(e.target.value)} />
            </div>
          </form>

          <Table style={{marginTop:12}}>
            <TableHead><TableRow><TableCell>Code</TableCell><TableCell>Name</TableCell><TableCell>Open</TableCell></TableRow></TableHead>
            <TableBody>
              {filtered.map(a => (
                <TableRow key={a._id}>
                  <TableCell>{a.code}</TableCell>
                  <TableCell>{a.name}</TableCell>
                  <TableCell><Link to={`/areas/${a._id}`}><Button variant="outlined">Open Area</Button></Link></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!filtered.length && <p><em>No areas yet.</em></p>}
        </div>
      )}
    </div>
  );
}
