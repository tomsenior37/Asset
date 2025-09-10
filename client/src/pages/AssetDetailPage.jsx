import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getAsset, updateAsset, listParts,
  listAssetAttachments, uploadAssetAttachment,
  deleteAssetAttachment, setMainPhoto
} from '../services/api';
import {
  Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Button, Select, MenuItem, Tabs, Tab
} from '@mui/material';

function BomRow({ row, index, parts, onChange, onRemove }) {
  return (
    <TableRow>
      <TableCell style={{minWidth: 240}}>
        <Select
          displayEmpty
          value={row.part || ''}
          onChange={e => onChange(index, { ...row, part: e.target.value || '' })}
          style={{minWidth: 220}}
        >
          <MenuItem value="">(free text)</MenuItem>
          {parts.map(p => (
            <MenuItem key={p._id} value={p._id}>{p.internalSku} — {p.name}</MenuItem>
          ))}
        </Select>
      </TableCell>
      <TableCell>
        <TextField
          label="Part Name"
          value={row.partName || ''}
          onChange={e=>onChange(index, { ...row, partName: e.target.value })}
        />
      </TableCell>
      <TableCell>
        <TextField
          label="Part No."
          value={row.partNo || ''}
          onChange={e=>onChange(index, { ...row, partNo: e.target.value })}
        />
      </TableCell>
      <TableCell style={{width:110}}>
        <TextField
          type="number"
          label="Qty"
          value={row.qty ?? 1}
          onChange={e=>onChange(index, { ...row, qty: Number(e.target.value) })}
        />
      </TableCell>
      <TableCell style={{width:120}}>
        <TextField
          label="Unit"
          value={row.unit || 'ea'}
          onChange={e=>onChange(index, { ...row, unit: e.target.value })}
        />
      </TableCell>
      <TableCell>
        <TextField
          label="Notes"
          value={row.notes || ''}
          onChange={e=>onChange(index, { ...row, notes: e.target.value })}
        />
      </TableCell>
      <TableCell style={{width:90}}>
        <Button color="error" variant="outlined" onClick={()=>onRemove(index)}>Delete</Button>
      </TableCell>
    </TableRow>
  );
}

export default function AssetDetailPage(){
  const { id } = useParams();
  const [asset, setAsset] = useState(null);
  const [parts, setParts] = useState([]);
  const [bom, setBom] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState(0);

  const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

  useEffect(() => {
    (async () => {
      const a = await getAsset(id);
      setAsset(a);
      setBom(a.bom || []);
      const lp = await listParts({});
      setParts(lp.items || []);
      const att = await listAssetAttachments(id);
      setAttachments(att || []);
    })();
  }, [id]);

  function addLine(){
    setBom([...(bom || []), { part: '', partName: '', partNo: '', qty: 1, unit: 'ea', notes: '' }]);
  }
  function updateLine(idx, row){
    const next = [...bom]; next[idx] = row; setBom(next);
  }
  function removeLine(idx){
    const next = [...bom]; next.splice(idx, 1); setBom(next);
  }
  async function saveBom(){
    setSaving(true); setMsg('');
    try{
      const clean = (bom||[]).map(b => ({
        part: b.part || undefined,
        partName: b.partName || '',
        partNo: b.partNo || '',
        qty: Number(b.qty || 1),
        unit: b.unit || 'ea',
        notes: b.notes || ''
      }));
      const updated = await updateAsset(id, { bom: clean });
      setAsset(updated);
      setBom(updated.bom || []);
      setMsg('BOM saved ✓');
    }catch(e){
      setMsg(e.response?.data?.error || e.message);
    }finally{
      setSaving(false);
    }
  }

  async function onUploadFile(file){
    if(!file) return;
    await uploadAssetAttachment(id, file);
    const att = await listAssetAttachments(id);
    setAttachments(att || []);
    // if it's the first photo and none set, offer to set main
  }

  async function onDeleteFile(filename){
    await deleteAssetAttachment(id, filename);
    const att = await listAssetAttachments(id);
    setAttachments(att || []);
    const fresh = await getAsset(id);
    setAsset(fresh);
  }

  async function onSetMain(filename){
    await setMainPhoto(id, filename);
    const fresh = await getAsset(id);
    setAsset(fresh);
  }

  if(!asset) return <div className="card"><p>Loading…</p></div>;

  const mainUrl = asset.mainPhoto
    ? `${apiBase}/uploads/assets/${id}/${asset.mainPhoto}`
    : '';

  return (
    <div>
      <div className="card">
        <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <h2 style={{margin:'4px 0'}}>Asset: {asset.name}</h2>
            <div>
              <small>Tag:</small> <strong>{asset.tag||'—'}</strong> &nbsp;•&nbsp;
              <small>Model:</small> <strong>{asset.model||'—'}</strong> &nbsp;•&nbsp;
              <small>Serial:</small> <strong>{asset.serial||'—'}</strong>
            </div>
          </div>
          <div>
            <Link to="/assets"><Button variant="outlined">← Back to Assets</Button></Link>
          </div>
        </div>
        <div style={{marginTop:10}}>
          {mainUrl
            ? <img src={mainUrl} alt="main" style={{maxHeight:180, border:'1px solid #ddd', borderRadius:8}}/>
            : <em>No main photo</em>}
        </div>
      </div>

      <Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{mb:1}}>
        <Tab label="BOM" />
        <Tab label="Documents" />
      </Tabs>

      {/* BOM TAB */}
      {tab === 0 && (
        <div className="card">
          <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
            <h3 style={{margin:0}}>Bill of Materials</h3>
            <div className="row">
              <Button variant="outlined" onClick={addLine}>+ Add Line</Button>
              <Button style={{marginLeft:8}} variant="contained" disabled={saving} onClick={saveBom}>Save</Button>
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
      )}

      {/* DOCUMENTS TAB */}
      {tab === 1 && (
        <div className="card">
          <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
            <h3 style={{margin:0}}>Documents</h3>
            <div className="row">
              <input type="file" onChange={e=>onUploadFile(e.target.files?.[0])} />
            </div>
          </div>

          {!attachments.length && <p><em>No files uploaded.</em></p>}
          {!!attachments.length && (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Preview / Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attachments.map(att => {
                  const url = `${apiBase}/uploads/assets/${id}/${att.filename}`;
                  const isImage = (att.mimetype||'').startsWith('image/');
                  const isMain = asset.mainPhoto === att.filename;
                  return (
                    <TableRow key={att.filename}>
                      <TableCell>
                        <div className="row" style={{alignItems:'center', gap:12}}>
                          {isImage
                            ? <img src={url} alt={att.originalname} style={{height:48, border:'1px solid #ddd', borderRadius:6}}/>
                            : <span style={{fontSize:12, padding:'4px 6px', border:'1px solid #ddd', borderRadius:6}}>FILE</span>
                          }
                          <a href={url} target="_blank" rel="noreferrer">{att.originalname || att.filename}</a>
                          {isMain && <span style={{fontSize:12, color:'#0a0', marginLeft:6}}>(main)</span>}
                        </div>
                      </TableCell>
                      <TableCell>{att.mimetype}</TableCell>
                      <TableCell>{(att.size/1024).toFixed(1)} KB</TableCell>
                      <TableCell>
                        <div className="row">
                          <Button size="small" variant="outlined" onClick={()=>window.open(url, '_blank')}>Open</Button>
                          <Button size="small" variant="outlined" onClick={()=>onSetMain(att.filename)}>Set main</Button>
                          <Button size="small" color="error" variant="outlined" onClick={()=>onDeleteFile(att.filename)}>Delete</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}
