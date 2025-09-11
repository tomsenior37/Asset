import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { listClients, getLocationTree, createLocation } from '../services/api';
import { Table, TableBody, TableCell, TableHead, TableRow, TextField, Button } from '@mui/material';

export default function ClientLocationsPage(){
  const { id: clientId } = useParams();
  const [clientName, setClientName] = useState('');
  const [sites, setSites] = useState([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState({ name:'', code:'' });

  useEffect(() => {
    (async () => {
      const clients = await listClients();
      const c = clients.find(x=>x._id===clientId);
      setClientName(c?.name || '');
      const tree = await getLocationTree(clientId);
      const rootSites = [];
      const walk = (n) => { if (n.kind==='site' && !n.parent) rootSites.push(n); (n.children||[]).forEach(walk); };
      tree.forEach(walk);
      setSites(rootSites.sort((a,b)=>a.name.localeCompare(b.name)));
    })();
  }, [clientId]);

  async function addSite(e){
    e.preventDefault();
    if(!form.name || !form.code) return;
    await createLocation(clientId, { ...form, kind:'site', parent: null });
    setForm({ name:'', code:'' });
    // reload
    const tree = await getLocationTree(clientId);
    const rootSites = []; const walk = n => { if(n.kind==='site' && !n.parent) rootSites.push(n); (n.children||[]).forEach(walk); };
    tree.forEach(walk); setSites(rootSites.sort((a,b)=>a.name.localeCompare(b.name)));
  }

  const filtered = sites.filter(s => !q || s.name.toLowerCase().includes(q.toLowerCase()) || s.code.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="card">
        <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <h2 style={{margin:0}}>Sites for {clientName}</h2>
          <Link to="/locations"><Button variant="outlined">← Back to Clients</Button></Link>
        </div>
      </div>

      <div className="card">
        <h3>Add Site</h3>
        <form onSubmit={addSite}>
          <div className="row" style={{gap:12, flexWrap:'wrap'}}>
            <TextField label="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
            <TextField label="Code" value={form.code} onChange={e=>setForm({...form, code:e.target.value})}/>
            <Button variant="contained" type="submit">Add Site</Button>
            <TextField label="Filter" value={q} onChange={e=>setQ(e.target.value)} />
          </div>
        </form>
      </div>

      <div className="card">
        <Table>
          <TableHead><TableRow><TableCell>Code</TableCell><TableCell>Name</TableCell><TableCell>Open</TableCell></TableRow></TableHead>
          <TableBody>
            {filtered.map(s => (
              <TableRow key={s._id}>
                <TableCell>{s.code}</TableCell>
                <TableCell>{s.name}</TableCell>
                <TableCell><Link to={`/sites/${s._id}`}><Button variant="outlined">Open Site</Button></Link></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!filtered.length && <p><em>No sites for this client.</em></p>}
      </div>
    </div>
  );
}
