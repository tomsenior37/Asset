import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getLocation, listClients, getLocationTree, listAssets, createAsset } from '../services/api'
import { Table, TableBody, TableCell, TableHead, TableRow, TextField, Button } from '@mui/material'

export default function LocationDetailPage(){
  const { id } = useParams()
  const [loc, setLoc] = useState(null)
  const [clientName, setClientName] = useState('')
  const [clientId, setClientId] = useState('')
  const [assets, setAssets] = useState([])
  const [form, setForm] = useState({ name:'', tag:'', category:'', model:'', serial:'' })

  useEffect(() => {
    (async () => {
      const l = await getLocation(id)
      setLoc(l)
      // find client name/id
      const cs = await listClients()
      const c = cs.find(x=>x._id===l.client)
      setClientName(c?.name || '')
      setClientId(c?._id || '')
    })()
  }, [id])

  async function refreshAssets(){
    if(!clientId) return
    const out = await listAssets({ client: clientId, location: id, limit: 200 })
    setAssets(out.items || [])
  }

  useEffect(()=>{ if(clientId) refreshAssets() }, [clientId])

  async function onCreate(e){
    e.preventDefault()
    if(!clientId || !id || !form.name) return
    await createAsset({ client: clientId, location: id, ...form })
    setForm({ name:'', tag:'', category:'', model:'', serial:'' })
    refreshAssets()
  }

  if(!loc) return <div className="card"><p>Loading…</p></div>

  return (
    <div>
      <div className="card">
        <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <h2 style={{margin:0}}>Location: {loc.name} <small>({loc.kind})</small></h2>
          <div className="row" style={{gap:8}}>
            <Link to="/locations"><Button variant="outlined">← Back to Locations</Button></Link>
          </div>
        </div>
        <div style={{marginTop:6}}><small>Client:</small> <strong>{clientName}</strong> &nbsp;•&nbsp; <small>Code:</small> <strong>{loc.code}</strong></div>
      </div>

      <div className="card">
        <h3>Assets in this {loc.kind}</h3>

        <form onSubmit={onCreate}>
          <div className="row" style={{flexWrap:'wrap', gap:12}}>
            <TextField label="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
            <TextField label="Tag" value={form.tag} onChange={e=>setForm({...form, tag:e.target.value})} />
            <TextField label="Category" value={form.category} onChange={e=>setForm({...form, category:e.target.value})} />
            <TextField label="Model" value={form.model} onChange={e=>setForm({...form, model:e.target.value})} />
            <TextField label="Serial" value={form.serial} onChange={e=>setForm({...form, serial:e.target.value})} />
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
        {!assets.length && <p><em>No assets at this {loc.kind} yet.</em></p>}
      </div>
    </div>
  )
}
