import React, { useEffect, useState } from 'react'
import { listClients, getLocationTree } from '../services/api'
import { Table, TableBody, TableCell, TableHead, TableRow, Select, MenuItem, TextField, Button } from '@mui/material'
import { Link } from 'react-router-dom'

export default function LocationsPage(){
  const [clients, setClients] = useState([])
  const [clientId, setClientId] = useState('')
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')

  useEffect(() => {
    (async () => {
      const cs = await listClients()
      setClients(cs)
      if (cs.length) setClientId(cs[0]._id)
    })()
  }, [])

  async function loadFlat(cid){
    const tree = await getLocationTree(cid)
    const out = []
    const index = new Map()
    // build map
    const walk = (n, parent=null) => {
      index.set(n._id, { ...n, parent })
      n.children?.forEach(c => walk(c, n))
    }
    tree.forEach(r => walk(r, null))

    // flatten with parent name & kind
    for (const [id, node] of index) {
      const parent = node.parent
      out.push({
        id,
        code: node.code,
        name: node.name,
        kind: node.kind,
        clientName: clients.find(c=>c._id===cid)?.name || '',
        parentName: parent ? parent.name : '(root)',
      })
    }
    setRows(out.sort((a,b)=>a.name.localeCompare(b.name)))
  }

  useEffect(() => { if (clientId) loadFlat(clientId) }, [clientId, clients])

  const filtered = rows.filter(r =>
    (q ? (r.name.toLowerCase().includes(q.toLowerCase()) || r.code.toLowerCase().includes(q.toLowerCase())) : true)
  )

  return (
    <div>
      <div className="card">
        <h2>Locations</h2>
        <div className="row" style={{flexWrap:'wrap', gap:12}}>
          <Select value={clientId} onChange={e=>setClientId(e.target.value)}>
            {clients.map(c => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
          </Select>
          <TextField label="Search name/code" value={q} onChange={e=>setQ(e.target.value)} />
          <Button variant="outlined" onClick={()=>loadFlat(clientId)}>Refresh</Button>
        </div>
      </div>

      <div className="card">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Client</TableCell>
              <TableCell>Parent</TableCell>
              <TableCell>Kind</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Open</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(r => (
              <TableRow key={r.id}>
                <TableCell>{r.clientName}</TableCell>
                <TableCell>{r.parentName}</TableCell>
                <TableCell>{r.kind}</TableCell>
                <TableCell>{r.code}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell><Link to={`/locations/${r.id}`}><Button variant="outlined">Assets</Button></Link></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!filtered.length && <p><em>No locations.</em></p>}
      </div>
    </div>
  )
}
