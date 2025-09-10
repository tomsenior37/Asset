import React, { useEffect, useState } from 'react'
import { listClients, getLocationTree, listAssets, getAsset, updateAsset, createAsset, uploadAssetAttachment, listParts } from '../services/api'
import { Table, TableBody, TableCell, TableHead, TableRow, TextField, Button, Select, MenuItem } from '@mui/material'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'

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
  const { isAdmin } = useAuth()
  const { clients, clientId, setClientId, flatLocs } = useClientAndLocations()
  const [filters, setFilters] = useState({ location: '', q: '' })
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 })
  const [parts, setParts] = useState([])

  const [form, setForm] = useState({
    location: '', name: '', tag: '', category: '', model: '', serial: '',
    bom: []
  })

  const [selectedId, setSelectedId] = useState('')
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [bomForm, setBomForm] = useState({ mode: 'part', part: '', partName: '', partNo: '', qty: 1, unit: 'ea', notes: '' })

  useEffect(() => { (async()=>{ const lp = await listParts({}); setParts(lp.items || []) })() }, [])

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

  async function onCreate(e){
    e.preventDefault()
    if(!clientId || !form.location || !form.name) return
    await createAsset({ client: clientId, ...form })
    setForm({ location: '', name: '', tag: '', category: '', model: '', serial: '', bom: [] })
    refresh(1)
  }

  async function onUpload(assetId, file){
    if(!file) return
    await uploadAssetAttachment(assetId, file)
    refresh(data.page)
  }

  function addBomLine(){
    setForm({...form, bom: [...(form.bom||[]), { part: '', qty: 1, unit: 'ea' }]})
  }

  async function selectAsset(id){
    setSelectedId(id)
    const a = await getAsset(id)
    setSelectedAsset(a)
  }

  async function addBomToSelected(){
    if(!selectedAsset) return
    const line = {}
    if(bomForm.mode === 'part' && bomForm.part){ line.part = bomForm.part }
    else { line.partName = bomForm.partName || 'Unnamed'; line.partNo = bomForm.partNo || '' }
    line.qty = Number(bomForm.qty)||1; line.unit = bomForm.unit || 'ea'; line.notes = bomForm.notes || ''
    const newBom = [ ...(selectedAsset.bom||[]), line ]
    const updated = await updateAsset(selectedAsset._id, { bom: newBom })
    setSelectedAsset(updated)
    refresh(data.page)
  }

  async function deleteBomLine(idx){
    if(!selectedAsset) return
    const newBom = (selectedAsset.bom||[]).filter((_,i)=>i!==idx)
    const updated = await updateAsset(selectedAsset._id, { bom: newBom })
    setSelectedAsset(updated)
    refresh(data.page)
  }

  return (
    <div>
      <div className="card">
        <h2>Filters</h2>
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

      {isAdmin && (
        <div className="card">
          <h2>Bulk Import (CSV)</h2>
          <p>Columns: <code>clientCode,siteCode,areaCode,name,tag,category,model,serial,status,notes</code></p>
          <div className="row">
            <input type="file" accept=".csv,text/csv" onChange={async e=>{
              const f = e.target.files[0]; if(!f) return;
              const buf = await f.arrayBuffer();
              const res = await fetch((import.meta.env.VITE_API_BASE || 'http://localhost:4000') + '/api/assets/import', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('assetdb_token')||'') },
                body: buf
              });
              const json = await res.json();
              alert('Inserted: ' + json.inserted + (json.errors?.length ? (' / Errors: ' + json.errors.length) : ''))
              refresh(1)
            }} />
            <a href={(import.meta.env.VITE_API_BASE || 'http://localhost:4000') + '/api/assets/export/csv'} target="_blank" rel="noreferrer">
              <Button variant="outlined">Export CSV</Button>
            </a>
          </div>
        </div>
      )}

      <div className="card">
        <h2>New Asset</h2>
        <form onSubmit={onCreate}>
          <div className="row">
            <Select value={form.location} onChange={e=>setForm({...form, location:e.target.value})}>
              <MenuItem value="">(pick a location)</MenuItem>
              {flatLocs.map(x => <MenuItem key={x._id} value={x._id}>{x.label}</MenuItem>)}
            </Select>
            <TextField label="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
            <TextField label="Tag" value={form.tag} onChange={e=>setForm({...form, tag:e.target.value})} />
            <TextField label="Category" value={form.category} onChange={e=>setForm({...form, category:e.target.value})} />
            <TextField label="Model" value={form.model} onChange={e=>setForm({...form, model:e.target.value})} />
            <TextField label="Serial" value={form.serial} onChange={e=>setForm({...form, serial:e.target.value})} />
          </div>
          <div style={{padding:'8px'}}>
            <Button variant="outlined" onClick={addBomLine}>+BOM line</Button>
            {(form.bom||[]).map((b, idx) => (
              <div className="row" key={idx}>
                <Select value={b.part||''} onChange={e=>{ const arr=[...form.bom]; arr[idx]={...arr[idx], part:e.target.value}; setForm({...form, bom:arr}) }}>
                  <MenuItem value="">(free text)</MenuItem>
                  {parts.map(p => <MenuItem key={p._id} value={p._id}>{p.internalSku} - {p.name}</MenuItem>)}
                </Select>
                <TextField label="Qty" type="number" value={b.qty||1} onChange={e=>{ const arr=[...form.bom]; arr[idx]={...arr[idx], qty:Number(e.target.value)}; setForm({...form, bom:arr}) }} />
                <TextField label="Unit" value={b.unit||'ea'} onChange={e=>{ const arr=[...form.bom]; arr[idx]={...arr[idx], unit:e.target.value}; setForm({...form, bom:arr}) }} />
              </div>
            ))}
          </div>
          <Button variant="contained" type="submit">Create</Button>
        </form>
      </div>

      <div className="card">
        <h2>Assets ({data.total})</h2>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell><TableCell>Tag</TableCell><TableCell>Model</TableCell><TableCell>Serial</TableCell><TableCell>Category</TableCell><TableCell>Status</TableCell><TableCell>Upload</TableCell><TableCell>Created</TableCell><TableCell>Actions</TableCell>
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
                <TableCell>
                  <input type="file" onChange={e=>onUpload(a._id, e.target.files[0])} />
                </TableCell>
                <TableCell>{new Date(a.createdAt).toLocaleString()}</TableCell>
                <TableCell><Button size="small" variant="outlined" onClick={()=>selectAsset(a._id)}>Edit BOM</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedAsset && (
        <div className="card">
          <h2>BOM for: {selectedAsset.name}</h2>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Part / Free text</TableCell>
                <TableCell>Qty</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(selectedAsset.bom||[]).map((b, idx) => (
                <TableRow key={idx}>
                  <TableCell>{idx+1}</TableCell>
                  <TableCell>
                    {b.part ? (() => {
                      const p = parts.find(x => x._id === b.part)
                      return p ? (p.internalSku + ' — ' + p.name) : ('Part ' + b.part)
                    })() : (b.partName || '(free text)')}
                  </TableCell>
                  <TableCell>{b.qty}</TableCell>
                  <TableCell>{b.unit}</TableCell>
                  <TableCell>{b.notes}</TableCell>
                  <TableCell><Button size="small" onClick={()=>deleteBomLine(idx)}>Delete</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div style={{marginTop:12}}>
            <h3>Add BOM line</h3>
            <div className="row">
              <Select value={bomForm.mode} onChange={e=>setBomForm({...bomForm, mode:e.target.value})}>
                <MenuItem value="part">Link to Part</MenuItem>
                <MenuItem value="free">Free text</MenuItem>
              </Select>
              {bomForm.mode === 'part' ? (
                <Select displayEmpty value={bomForm.part} onChange={e=>setBomForm({...bomForm, part:e.target.value})}>
                  <MenuItem value="">(choose part)</MenuItem>
                  {parts.map(p => <MenuItem key={p._id} value={p._id}>{p.internalSku} - {p.name}</MenuItem>)}
                </Select>
              ) : (
                <>
                  <TextField label="Part name" value={bomForm.partName} onChange={e=>setBomForm({...bomForm, partName:e.target.value})} />
                  <TextField label="Part no." value={bomForm.partNo} onChange={e=>setBomForm({...bomForm, partNo:e.target.value})} />
                </>
              )}
              <TextField label="Qty" type="number" value={bomForm.qty} onChange={e=>setBomForm({...bomForm, qty:e.target.value})} />
              <TextField label="Unit" value={bomForm.unit} onChange={e=>setBomForm({...bomForm, unit:e.target.value})} />
              <TextField label="Notes" value={bomForm.notes} onChange={e=>setBomForm({...bomForm, notes:e.target.value})} />
              <Button variant="contained" onClick={addBomToSelected}>Add</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
