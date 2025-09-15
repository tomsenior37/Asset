import React, { useEffect, useState } from 'react';
import { listClients } from '../services/api';
import { Table, TableBody, TableCell, TableHead, TableRow, TextField, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export default function LocationsPage(){
  const [clients, setClients] = useState([]);
  const [q, setQ] = useState('');

  useEffect(() => { (async () => setClients(await listClients()))(); }, []);
  const filtered = clients.filter(c =>
    !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.code.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <div className="card">
        <h2>Clients</h2>
        <div className="row" style={{gap:12, flexWrap:'wrap'}}>
          <TextField label="Search name/code" value={q} onChange={e=>setQ(e.target.value)} />
          <Button variant="outlined" onClick={async()=>setClients(await listClients())}>Refresh</Button>
        </div>
      </div>

      <div className="card">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell><TableCell>Code</TableCell><TableCell>Open</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(c => (
              <TableRow key={c._id}>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.code}</TableCell>
                <TableCell>
                  <Link to={`/clients/${c._id}/locations`}>
                    <Button variant="outlined">Sites</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!filtered.length && <p><em>No clients found.</em></p>}
      </div>
    </div>
  );
}
