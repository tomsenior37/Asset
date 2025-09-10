import React, { useEffect, useState } from 'react'
import { listClients, getLocationTree, createLocation } from '../services/api'
import { TextField, Button, Select, MenuItem } from '@mui/material'

function Node({ node }){
  return (
    <li>
      <strong>{node.name}</strong> <em>({node.code})</em> <small>{node.kind}</small>
      {node.children && node.children.length ? (
        <ul>{node.children.map(c => <Node key={c._id} node={c} />)}</ul>
      ) : null}
    </li>
  )
}

export default function LocationsPage(){
  const [clients, setClients] = useState([])
  const [clientId, setClientId] = useState('')
  const [tree, setTree] = useState([])

  const [form, setForm] = useState({ name: '', code: '', kind: 'site', parent: '' })
  const [flat, setFlat] = useState([])

  useEffect(() => {
    (async () => {
      const cs = await listClients()
      setClients(cs)
      if (cs.length) setClientId(cs[0]._id)
    })()
  }, [])

  async function loadTree(cid){
    const t = await getLocationTree(cid)
    setTree(t)
    const flatList = []
    const walk = (n, depth=0) => {
      flatList.push({ _id: n._id, kind: n.kind, label: '—'.repeat(depth) + n.name })
      n.children?.forEach(c => walk(c, depth+1))
    }
    t.forEach(r => walk(r, 0))
    setFlat(flatList)
  }

  useEffect(() => { if (clientId) loadTree(clientId) }, [clientId])

  async function onCreate(e){
    e.preventDefault()
    await createLocation(clientId, form.parent ? { ...form } : { ...form, parent: null })
    setForm({ name: '', code: '', kind: 'site', parent: '' })
    loadTree(clientId)
  }

  return (
    <div>
      <div className="card">
        <h2>Pick Client</h2>
        <Select value={clientId} onChange={e=>setClientId(e.target.value)}>
          {clients.map(c => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
        </Select>
      </div>

      <div className="card">
        <h2>New Location</h2>
        <form onSubmit={onCreate}>
          <div className="row">
            <TextField label="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
            <TextField label="Code" value={form.code} onChange={e=>setForm({...form, code:e.target.value})} />
            <Select value={form.kind} onChange={e=>setForm({...form, kind:e.target.value})}>
              <MenuItem value="site">site</MenuItem>
              <MenuItem value="area">area</MenuItem>
            </Select>
            <Select value={form.parent} onChange={e=>setForm({...form, parent:e.target.value})}>
              <MenuItem value="">(no parent)</MenuItem>
              {flat.map(x => <MenuItem key={x._id} value={x._id}>{x.label}</MenuItem>)}
            </Select>
            <Button variant="contained" type="submit">Create</Button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Move Subtree</h2>
        <div className="row">
          <Select displayEmpty value={form.moveTarget || ''} onChange={e=>setForm({...form, moveTarget:e.target.value})}>
            <MenuItem value="">Pick location to move</MenuItem>
            {flat.map(x => <MenuItem key={x._id} value={x._id}>{x.label}</MenuItem>)}
          </Select>
          <Select displayEmpty value={form.newParent || ''} onChange={e=>setForm({...form, newParent:e.target.value})}>
            <MenuItem value="">(Root for sites only)</MenuItem>
            {flat.filter(x=>x.kind==='site').map(x => <MenuItem key={x._id} value={x._id}>{x.label}</MenuItem>)}
          </Select>
          <Button variant="contained" onClick={async ()=>{
            if(!form.moveTarget) return alert('Pick a location')
            const id = form.moveTarget
            const newParent = form.newParent || null
            const res = await fetch((import.meta.env.VITE_API_BASE || 'http://localhost:4000') + '/api/locations/' + id + '/move-subtree', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('assetdb_token')||'') },
              body: JSON.stringify({ newParent })
            })
            const json = await res.json()
            if(!res.ok){ alert(json.error || 'Move failed') } else { alert('Moved'); loadTree(clientId) }
          }}>Move</Button>
        </div>
      </div>

      <div className="card">
        <h2>Tree</h2>
        <ul>
          {tree.map(n => <Node key={n._id} node={n} />)}
        </ul>
      </div>
    </div>
  )
}
