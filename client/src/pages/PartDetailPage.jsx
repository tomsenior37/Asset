import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPart, updatePart, listSuppliers } from '../services/api';
import { Tabs, Tab, TextField, Button, Table, TableHead, TableBody, TableCell, TableRow, Select, MenuItem } from '@mui/material';
import { useAuth } from '../AuthContext.jsx';

export default function PartDetailPage(){
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState(0);
  const [p, setP] = useState(null);
  const [form, setForm] = useState({});
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => { (async()=>{
    const part = await getPart(id);
    setP(part);
    setForm({
      name: part.name, internalSku: part.internalSku, category: part.category,
      unit: part.unit, notes: part.notes,
      specs: part.specs || {},
      supplierOptions: part.supplierOptions || [],
      internal: {
        onHand: part.internal?.onHand || 0,
        standardCost: part.internal?.standardCost || 0,
        reorderPoint: part.internal?.reorderPoint || 0,
        reorderQty: part.internal?.reorderQty || 0
      }
    });
    setSuppliers(await listSuppliers());
  })(); }, [id]);

  function addSupplierLine(){
    setForm(f => ({ ...f, supplierOptions: [...(f.supplierOptions||[]), { supplier:'', supplierSku:'', price:0, currency:'USD', leadTimeDays:0, moq:1, preferred:false }] }));
  }

  async function save(){
    const out = await updatePart(id, form);
    setP(out);
    setForm({
      name: out.name, internalSku: out.internalSku, category: out.category,
      unit: out.unit, notes: out.notes,
      specs: out.specs || {},
      supplierOptions: out.supplierOptions || [],
      internal: {
        onHand: out.internal?.onHand || 0,
        standardCost: out.internal?.standardCost || 0,
        reorderPoint: out.internal?.reorderPoint || 0,
        reorderQty: out.internal?.reorderQty || 0
      }
    });
  }

  if (!p) return <div className="card"><p>Loading…</p></div>;

  return (
    <div>
      <div className="card">
        <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <h2 style={{margin:0}}>Part: {p.name} <span style={{fontSize:14, color:'#777'}}>({p.internalSku})</span></h2>
          <Link to="/parts"><Button variant="outlined">← Back to Parts</Button></Link>
        </div>
      </div>

      <Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{mb:1}}>
        <Tab label="Overview" />
        <Tab label="Suppliers" />
        <Tab label="Inventory" />
        <Tab label="Specs" />
      </Tabs>

      {/* Overview */}
      {tab===0 && (
        <div className="card">
          <div className="row">
            <TextField label="Internal SKU" value={form.internalSku||''} onChange={e=>setForm({...form, internalSku:e.target.value})}/>
            <TextField label="Name" value={form.name||''} onChange={e=>setForm({...form, name:e.target.value})}/>
            <TextField label="Category" value={form.category||''} onChange={e=>setForm({...form, category:e.target.value})}/>
            <TextField label="Unit" value={form.unit||''} onChange={e=>setForm({...form, unit:e.target.value})}/>
          </div>
          <TextField label="Notes" fullWidth multiline minRows={3} value={form.notes||''} onChange={e=>setForm({...form, notes:e.target.value})}/>
          {isAdmin && <div style={{marginTop:8}}><Button variant="contained" onClick={save}>Save</Button></div>}
        </div>
      )}

      {/* Suppliers */}
      {tab===1 && (
        <div className="card">
          <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
            <h3 style={{margin:0}}>Supplier Options</h3>
            {isAdmin && <Button variant="outlined" onClick={addSupplierLine}>+ Add Supplier</Button>}
          </div>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Supplier</TableCell>
                <TableCell>Supplier SKU</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Currency</TableCell>
                <TableCell>Lead (days)</TableCell>
                <TableCell>MOQ</TableCell>
                <TableCell>Preferred</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(form.supplierOptions||[]).map((opt, i)=>(
                <TableRow key={i}>
                  <TableCell>
                    <div className="row">
                      <Select
                        displayEmpty
                        value={opt.supplier || ''}
                        onChange={e=>{
                          const arr=[...form.supplierOptions]; arr[i]={...arr[i], supplier:e.target.value}; setForm({...form, supplierOptions:arr});
                        }}
                        style={{minWidth:220}}
                      >
                        <MenuItem value=""><em>Select supplier…</em></MenuItem>
                        {suppliers.map(s => (
                          <MenuItem key={s._id} value={s._id}>{s.name} ({s.code})</MenuItem>
                        ))}
                      </Select>
                      {opt.supplier && (
                        <Link to={`/suppliers/${opt.supplier}`} style={{marginLeft:8}}>
                          <Button size="small" variant="outlined">View</Button>
                        </Link>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <TextField value={opt.supplierSku||''} onChange={e=>{
                      const arr=[...form.supplierOptions]; arr[i]={...arr[i], supplierSku:e.target.value}; setForm({...form, supplierOptions:arr});
                    }}/>
                  </TableCell>
                  <TableCell>
                    <TextField type="number" value={opt.price||0} onChange={e=>{
                      const arr=[...form.supplierOptions]; arr[i]={...arr[i], price:Number(e.target.value)}; setForm({...form, supplierOptions:arr});
                    }}/>
                  </TableCell>
                  <TableCell>
                    <TextField value={opt.currency||'USD'} onChange={e=>{
                      const arr=[...form.supplierOptions]; arr[i]={...arr[i], currency:e.target.value}; setForm({...form, supplierOptions:arr});
                    }}/>
                  </TableCell>
                  <TableCell>
                    <TextField type="number" value={opt.leadTimeDays||0} onChange={e=>{
                      const arr=[...form.supplierOptions]; arr[i]={...arr[i], leadTimeDays:Number(e.target.value)}; setForm({...form, supplierOptions:arr});
                    }}/>
                  </TableCell>
                  <TableCell>
                    <TextField type="number" value={opt.moq||1} onChange={e=>{
                      const arr=[...form.supplierOptions]; arr[i]={...arr[i], moq:Number(e.target.value)}; setForm({...form, supplierOptions:arr});
                    }}/>
                  </TableCell>
                  <TableCell>
                    <Select value={opt.preferred? 'yes':'no'} onChange={e=>{
                      const arr=[...form.supplierOptions]; arr[i]={...arr[i], preferred: e.target.value==='yes'}; setForm({...form, supplierOptions:arr});
                    }}>
                      <MenuItem value="no">no</MenuItem>
                      <MenuItem value="yes">yes</MenuItem>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {isAdmin && <div style={{marginTop:8}}><Button variant="contained" onClick={save}>Save</Button></div>}
        </div>
      )}

      {/* Inventory */}
      {tab===2 && (
        <div className="card">
          <h3>Inventory (Internal)</h3>
          <div className="row">
            <TextField label="On hand" type="number" value={form.internal?.onHand ?? 0} onChange={e=>{
              setForm({...form, internal:{ ...(form.internal||{}), onHand:Number(e.target.value) }});
            }} />
            <TextField label="Std Cost" type="number" value={form.internal?.standardCost ?? 0} onChange={e=>{
              setForm({...form, internal:{ ...(form.internal||{}), standardCost:Number(e.target.value) }});
            }} />
            <TextField label="Reorder Point" type="number" value={form.internal?.reorderPoint ?? 0} onChange={e=>{
              setForm({...form, internal:{ ...(form.internal||{}), reorderPoint:Number(e.target.value) }});
            }} />
            <TextField label="Reorder Qty" type="number" value={form.internal?.reorderQty ?? 0} onChange={e=>{
              setForm({...form, internal:{ ...(form.internal||{}), reorderQty:Number(e.target.value) }});
            }} />
          </div>
          {isAdmin && <div style={{marginTop:8}}><Button variant="contained" onClick={save}>Save</Button></div>}
        </div>
      )}

      {/* Specs */}
      {tab===3 && (
        <div className="card">
          <h3>Specs (JSON)</h3>
          <TextField
            fullWidth multiline minRows={10}
            value={JSON.stringify(form.specs || {}, null, 2)}
            onChange={e=>{
              try {
                const val = JSON.parse(e.target.value || '{}');
                setForm({...form, specs: val});
              } catch (_e) { /* ignore parse errors while typing */ }
            }}
          />
          {isAdmin && <div style={{marginTop:8}}><Button variant="contained" onClick={save}>Save</Button></div>}
        </div>
      )}
    </div>
  );
}
