import React, { useEffect, useState } from 'react'
import { listBomTemplates, createBomTemplate, updateBomTemplate, deleteBomTemplate, listClients, listParts } from '../services/api'
import { Table, TableBody, TableCell, TableHead, TableRow, TextField, Button, Select, MenuItem } from '@mui/material'
import { useAuth } from '../AuthContext.jsx'

function LineRow({ row, idx, parts, onChange, onRemove }){
  return (
    <div className="row" style={{marginBottom:8}}>
      <Select displayEmpty value={row.part || ''} onChange={e=>onChange(idx, { ...row, part: e.target.value || '' })} style={{minWidth:220}}>
        <MenuItem value="">(free text)</MenuItem>
        {parts.map(p => <MenuItem key={p._id} value={p._id}>{p.internalSku} — {p.name}</MenuItem>)}
      </Select>
      <TextField label="Part Name" value={row.partName||''} onChange={e=>onChange(idx, { ...row, partName: e.target.value })} />
      <TextField label="Part No." value={row.partNo||''} onChange={e=>onChange(idx, { ...row, partNo: e.target.value })} />
      <TextField type="number" label="Qty" value={row.qty||1} onChange={e=>onChange(idx, { ...row, qty: Number(e.target.value) })} style={{width:120}} />
      <TextField label="Unit" value={row.unit||'ea'} onChange={e=>onChange(idx, { ...row, unit: e.target.value })} style={{width:120}} />
      <TextField label="Notes" value={row.notes||''} onChange={e=>onChange(idx, { ...row, notes: e.target.value })} />
      <Button color="error" variant="outlined" onClick={()=>onRemove(idx)}>Delete</Button>
    </div>
  )
}

export default function TemplatesPage(){
  const { isAdmin } = useAuth()
  const [items, setItems] = useState([])
  const [clients, setClients] = useState([])
  const [parts, setParts] = useState([])
  const [form, setForm] = useState({ name:'', client:'', category:'', lines:[] })

  useEffect(() => { (async()=>{
    setItems(await listBomTemplates({}))
    setClients(await listClients())
    const lp = await listParts({}); setParts(lp.items||[])
  })() }, [])

  function addLine(){ setForm({...form, lines:[...(form.lines||[]), { qty:1, unit:'ea' }]}) }
  function changeLine(idx, row){ const arr=[...form.lines]; arr[idx]=row; setForm({...form, lines:arr}) }
  function removeLine(idx){ const arr=[...form.lines]; arr.splice(idx,1); setForm({...form, lines:arr}) }

  async function onCreate(e){
    e.preventDefault()
    const payload = { ...form, client: form.client || null }
    await createBomTemplate(payload)
    setForm({ name:'', client:'', category:'', lines:[] })
    setItems(await listBomTemplates({}))
  }

  if(!isAdmin){
    return <div className="card"><p>You need admin role to manage templates.</p></div>
  }

  return (
    <div>
      <div className="card">
        <h2>New BOM Template (admin)</h2>
        <form onSubmit={onCreate}>
          <div className="row">
            <TextField label="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
            <Select displayEmpty value={form.client} onChange={e=>setForm({...form, client:e.target.value})} style={{minWidth:220}}>
              <MenuItem value="">(Global template)</MenuItem>
              {clients.map(c => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
            </Select>
            <TextField label="Category (optional)" value={form.category} onChange={e=>setForm({...form, category:e.target.value})} />
            <Button variant="outlined" onClick={addLine}>+ Line</Button>
            <Button variant="contained" type="submit">Create</Button>
          </div>
        </form>
        <div style={{marginTop:8}}>
          {(form.lines||[]).map((row, idx) => (
            <LineRow key={idx} row={row} idx={idx} parts={parts} onChange={changeLine} onRemove={removeLine} />
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Templates</h2>
        <Table>
          <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Scope</TableCell><TableCell>Lines</TableCell><TableCell>Updated</TableCell></TableRow></TableHead>
          <TableBody>
            {items.map(t => (
              <TableRow key={t._id}>
                <TableCell>{t.name}</TableCell>
                <TableCell>{t.client ? 'Client' : 'Global'}</TableCell>
                <TableCell>{(t.lines||[]).length}</TableCell>
                <TableCell>{new Date(t.updatedAt).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
