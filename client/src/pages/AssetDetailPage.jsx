
import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getAsset, updateAsset, listParts, listBomTemplates, applyTemplateToAsset, cloneBomFromAsset, listAssets } from '../services/api'
import { Table, TableBody, TableCell, TableHead, TableRow, TextField, Button, Select, MenuItem } from '@mui/material'

function BomRow({ row, index, parts, onChange, onRemove }) {
  return (
    <TableRow>
      <TableCell style={{minWidth: 240}}>
        <Select displayEmpty value={row.part || ''} onChange={e => onChange(index, { ...row, part: e.target.value || '' })} style={{minWidth: 220}}>
          <MenuItem value="">(free text)</MenuItem>
          {parts.map(p => (
            <MenuItem key={p._id} value={p._id}>{p.internalSku} — {p.name}</MenuItem>
          ))}
        </Select>
      </TableCell>
      <TableCell><TextField label="Part Name" value={row.partName || ''} onChange={e=>onChange(index, { ...row, partName: e.target.value })} /></TableCell>
      <TableCell><TextField label="Part No." value={row.partNo || ''} onChange={e=>onChange(index, { ...row, partNo: e.target.value })} /></TableCell>
      <TableCell style={{width:110}}><TextField type="number" label="Qty" value={row.qty ?? 1} onChange={e=>onChange(index, { ...row, qty: Number(e.target.value) })} /></TableCell>
      <TableCell style={{width:120}}><TextField label="Unit" value={row.unit || 'ea'} onChange={e=>onChange(index, { ...row, unit: e.target.value })} /></TableCell>
      <TableCell><TextField label="Notes" value={row.notes || ''} onChange={e=>onChange(index, { ...row, notes: e.target.value })} /></TableCell>
      <TableCell style={{width:90}}>
        <Button color="error" variant="outlined" onClick={()=>onRemove(index)}>Delete</Button>
      </TableCell>
    </TableRow>
  )
}

export default function AssetDetailPage(){
  const { id } = useParams()
  const [asset, setAsset] = useState(null)
  const [bom, setBom] = useState([])
  const [parts, setParts] = useState([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [cloneQ, setCloneQ] = useState('')
  const [cloneOptions, setCloneOptions] = useState([])
  const [cloneFrom, setCloneFrom] = useState('')

  useEffect(() => {
    (async () => {
      const a = await getAsset(id)
      setAsset(a)
      setBom(a.bom || [])
      const lp = await listParts({})
      setParts(lp.items || [])
      const tmpls = await listBomTemplates({ client: a.client })
      setTemplates(tmpls)
    })()
  }, [id])

  function addLine(){
    setBom([...(bom||[]), { part: '', partName: '', partNo: '', qty: 1, unit: 'ea', notes: '' }])
  }
  function updateLine(idx, row){
    const next = [...bom]; next[idx] = row; setBom(next)
  }
  function removeLine(idx){
    const next = [...bom]; next.splice(idx, 1); setBom(next)
  }

  async function save(){
    setSaving(true); setMsg('')
    try{
      const clean = (bom||[]).map(b => ({
        part: b.part || undefined,
        partName: b.partName || '',
        partNo: b.partNo || '',
        qty: Number(b.qty || 1),
        unit: b.unit || 'ea',
        notes: b.notes || ''
      }))
      const updated = await updateAsset(id, { bom: clean })
      setAsset(updated)
      setBom(updated.bom || [])
      setMsg('Saved ✓')
    }catch(e){
      setMsg(e.response?.data?.error || e.message)
    }finally{
      setSaving(false)
    }
  }

  if(!asset) return <div className="card"><p>Loading…</p></div>

  return (
    <div>
      <div className="card">
        <div className="row" style={{justifyContent:'space-between'}}>
          <div>
            <h2 style={{margin:'4px 0'}}>Asset: {asset.name}</h2>
            <div><small>Tag:</small> <strong>{asset.tag||'—'}</strong> • <small>Model:</small> <strong>{asset.model||'—'}</strong> • <small>Serial:</small> <strong>{asset.serial||'—'}</strong></div>
          </div>
          <div>
            <Link to="/assets"><Button variant="outlined">← Back to Assets</Button></Link>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <h3 style={{margin:0}}>Bill of Materials</h3>
          <div className="row">
            <Button variant="outlined" onClick={addLine}>+ Add Line</Button>
            <Button style={{marginLeft:8}} variant="contained" disabled={saving} onClick={save}>Save</Button>
          </div>
        </div>

        <div className="row" style={{gap:16, marginTop:12, marginBottom:12}}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <Select displayEmpty value={selectedTemplate} onChange={e=>setSelectedTemplate(e.target.value)} style={{minWidth:280}}>
              <MenuItem value="">(Pick a template)</MenuItem>
              {templates.map(t => <MenuItem key={t._id} value={t._id}>{t.name} {t.client ? '' : '(Global)'}</MenuItem>)}
            </Select>
            <Button variant="outlined" disabled={!selectedTemplate} onClick={async ()=>{ const up = await applyTemplateToAsset(id, { templateId: selectedTemplate, mode:'append' }); setAsset(up); setBom(up.bom||[]); setMsg('Applied template (append) ✓') }}>Apply (append)</Button>
            <Button variant="outlined" color="warning" disabled={!selectedTemplate} onClick={async ()=>{ const up = await applyTemplateToAsset(id, { templateId: selectedTemplate, mode:'replace' }); setAsset(up); setBom(up.bom||[]); setMsg('Applied template (replace) ✓') }}>Apply (replace)</Button>
          </div>

          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <TextField label="Find asset to clone from" value={cloneQ} onChange={async e=>{ const v=e.target.value; setCloneQ(v); if(v.length>=2){ const ls = await listAssets({ client: asset.client, q: v, limit: 20 }); setCloneOptions(ls.items||[]) } }} />
            <Select displayEmpty value={cloneFrom} onChange={e=>setCloneFrom(e.target.value)} style={{minWidth:280}}>
              <MenuItem value="">(Pick matching asset)</MenuItem>
              {cloneOptions.map(a => <MenuItem key={a._id} value={a._id}>{a.name} — {a.tag||a.model||''}</MenuItem>)}
            </Select>
            <Button variant="outlined" disabled={!cloneFrom} onClick={async ()=>{ const up = await cloneBomFromAsset(id, { fromAssetId: cloneFrom, mode:'append' }); setAsset(up); setBom(up.bom||[]); setMsg('Cloned (append) ✓') }}>Clone (append)</Button>
            <Button variant="outlined" color="warning" disabled={!cloneFrom} onClick={async ()=>{ const up = await cloneBomFromAsset(id, { fromAssetId: cloneFrom, mode:'replace' }); setAsset(up); setBom(up.bom||[]); setMsg('Cloned (replace) ✓') }}>Clone (replace)</Button>
          </div>
        </div>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Part (optional)</TableCell>
              <TableCell>Part Name</TableCell>
              <TableCell>Part No.</TableCell>
              <TableCell>Qty</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell>Notes</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(bom||[]).length ? (bom.map((row, idx) => (
              <BomRow key={idx} row={row} index={idx} parts={parts} onChange={updateLine} onRemove={removeLine} />
            ))) : (
              <TableRow><TableCell colSpan={7}><em>No BOM lines yet.</em></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        {msg && <p style={{color: msg.includes('✓') ? 'green' : 'crimson'}}>{msg}</p>}
      </div>
    </div>
  )
}
