import React, { useEffect, useState } from 'react'
import { listClients, getLocationTree, listAssets } from '../services/api'
import { Table, TableBody, TableCell, TableHead, TableRow, TextField, Button, Select, MenuItem } from '@mui/material'
import { Link } from 'react-router-dom'

function useClientAndLocations(){
  const [clients, setClients] = useState([])
  const [clientId, setClientId] = useState('')
  const [flatLocs, setFlatLocs] = useState([])

  useEffect(() => {
    (async () => {
      const cs = await listClients()
      setClients(cs)
      if (cs.length) setClientId(cs[0]._id)
    })()
  }, [])

  useEffect(() => {
    if (!clientId) return
    ;(async () => {
      const tree = await getLocationTree(clientId)
      const flat = []
      const walk = (n, depth=0) => {
        flat.push({ _id: n._id, label: '—'.repeat(depth) + n.name })
        n.children?.forEach(c => walk(c, depth+1))
      }
      tree.forEach(r => walk(r))
      setFlatLocs(flat)
    })()
  }, [clientId])

  return { clients, clientId, setClientId, flatLocs }
}

export default function AssetsPage(){
  const { clients, clientId, setClientId, flatLocs } = useClientAndLocations()
  const [filters, setFilters] = useState({ location: '', q: '' })
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 })

  async function refresh(page=1){
    if(!clientId) return
    const out = await listAssets({
      client: clientId,
      location: filters.location || undefined,
      q: filters.q || undefined,
      page, limit: 50
    })
    setData(out)
  }

  useEffect(() => { refresh(1) }, [clientId, filters.location, filters.q])

  return (
    <div>
      <div className="card">
        <h2>Assets</h2>
        <div className="row">
          <Select value={clientId} onChange={e=>setClientId(e.target.value)}>
            {clients.map(c => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
          </Select>
          <Select value={filters.location} onChange={e=>setFilters({...filters, location:e.target.value})}>
            <MenuItem value="">(any location)</MenuItem>
            {flatLocs.map(x => <MenuItem key={x._id} value={x._id}>{x.label}</MenuItem>)}
          </Select>
          <TextField label="Search" value={filters.q} onChange={e=>setFilters({...filters, q:e.target.value})} />
          <Button variant="outlined" onClick={()=>refresh(1)}>Apply</Button>
        </div>
      </div>

      <div className="card">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell><TableCell>Tag</TableCell><TableCell>Model</TableCell><TableCell>Serial</TableCell><TableCell>Category</TableCell><TableCell>Status</TableCell><TableCell>Created</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.items.map(a => (
              <TableRow key={a._id}>
                <TableCell><Link to={`/assets/${a._id}`}>{a.name}</Link></TableCell>
                <TableCell>{a.tag}</TableCell>
                <TableCell>{a.model}</TableCell>
                <TableCell>{a.serial}</TableCell>
                <TableCell>{a.category}</TableCell>
                <TableCell>{a.status}</TableCell>
                <TableCell>{new Date(a.createdAt).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!data.items.length && <p><em>No assets found.</em></p>}
      </div>
    </div>
  )
}
