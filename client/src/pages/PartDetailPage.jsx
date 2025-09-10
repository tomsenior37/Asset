import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPart, updatePart, listClients, getLocationTree } from '../services/api';
import { Tabs, Tab, TextField, Button, Table, TableHead, TableBody, TableCell, TableRow, Select, MenuItem } from '@mui/material';
import { useAuth } from '../AuthContext.jsx';

export default function PartDetailPage(){
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState(0);
  const [p, setP] = useState(null);
  const [form, setForm] = useState({});
  const [clients, setClients] = useState([]);
  const [sites, setSites] = useState([]);

  useEffect(() => { (async()=>{
    const part = await getPart(id);
    setP(part);
    setForm({
      name: part.name, internalSku: part.internalSku, category: part.category,
      unit: part.unit, notes: part.notes,
      specs: part.specs || {},
      supplierOptions: part.supplierOptions || [],
      internal: {
        standardCost: part.internal?.standardCost || 0,
        reorderPoint: part.internal?.reorderPoint || 0,
        reorderQty: part.internal?.reorderQty || 0,
        stockBySite: part.internal?.stockBySite || []
      }
    });
    setClients(await listClients());
  })(); }, [id]);

  async function pickClient(clientId){
    const tree = await getLocationTree(clientId);
    const flat = [];
    const walk = (n)=>{ if(n.kind==='site') flat.push(n); (n.children||[]).forEach(walk); };
    tree.forEach(walk);
    setSites(flat);
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
        standardCost: out.internal?.standardCost || 0,
        reorderPoint: out.internal?.reorderPoint || 0,
        reorderQty: out.internal?.reorderQty || 0,
        stockBySite: out.internal?.stockBySite || []
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
        <Tab label="Stock" />
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
          <h3>Supplier Options</h3>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Supplier ID / SKU</TableCell>
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
                      <TextField label="Supplier" value={opt.supplier||''} onChange={e=>{
                        const arr=[...form.supplierOptions]; arr[i]={...arr[i], supplier:e.target.value}; setForm({...form, supplierOptions:arr});
                      }}/>
                      <TextField label="Supplier SKU" value={opt.supplierSku||''} onChange={e=>{
                        const arr=[...form.supplierOptions]; arr[i]={...arr[i], supplierSku:e.target.value}; setForm({...form, supplierOptions:arr});
                      }}/>
                    </div>
                  </TableCell>
                  <TableCell><TextField type="number" value={opt.price||0} onChange={e=>{
                    const arr=[...form.supplierOptions]; arr[i]={...arr[i], price:Number(e.target.value)}; setForm({...form, supplierOptions:arr});
                  }}/></TableCell>
                  <TableCell><TextField value={opt.currency||'USD'} onChange={e=>{
                    const arr=[...form.supplierOptions]; arr[i]={...arr[i], currency:e.target.value}; setForm({...form, supplierOptions:arr});
                  }}/></TableCell>
                  <TableCell><TextField type="number" value={opt.leadTimeDays||0} onChange={e=>{
                    const arr=[...form.supplierOptions]; arr[i]={...arr[i], leadTimeDays:Number(e.target.value)}; setForm({...form, supplierOptions:arr});
                  }}/></TableCell>
                  <TableCell><TextField type="number" value={opt.moq||1} onChange={e=>{
                    const arr=[...form.supplierOptions]; arr[i]={...arr[i], moq:Number(e.target.value)}; setForm({...form, supplierOptions:arr});
                  }}/></TableCell>
                  <TableCell><Select value={opt.preferred? 'yes':'no'} onChange={e=>{
                    const arr=[...form.supplierOptions]; arr[i]={...arr[i], preferred: e.target.value==='yes'}; setForm({...form, supplierOptions:arr});
                  }}>
                    <MenuItem value="no">no</MenuItem>
                    <MenuItem value="yes">yes</MenuItem>
                  </Select></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {isAdmin && <div style={{marginTop:8}}><Button variant="contained" onClick={save}>Save</Button></div>}
        </div>
      )}

      {/* Stock */}
      {tab===2 && (
        <div className="card">
          <h3>Stock By Site</h3>
          <div className="row">
            <Select displayEmpty value="" onChange={e=>pickClient(e.target.value)}>
              <MenuItem value="">Pick client for sites</MenuItem>
              {clients.map(c=><MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
            </Select>
          </div>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Site ID</TableCell>
                <TableCell>Qty</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(form.internal?.stockBySite||[]).map((s, i)=>(
                <TableRow key={i}>
                  <TableCell>
                    <Select value={s.site||''} onChange={e=>{
                      const arr=[...(form.internal?.stockBySite||[])]; arr[i]={...arr[i], site:e.target.value};
                      setForm({...form, internal:{ ...(form.internal||{}), stockBySite:arr }});
                    }}>
                      {sites.map(site => <MenuItem key={site._id} value={site._id}>{site.name}</MenuItem>)}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <TextField type="number" value={s.qty||0} onChange={e=>{
                      const arr=[...(form.internal?.stockBySite||[])]; arr[i]={...arr[i], qty:Number(e.target.value)};
                      setForm({...form, internal:{ ...(form.internal||{}), stockBySite:arr }});
                    }}/>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div style={{marginTop:8}}>
            <Button variant="outlined" onClick={()=>{
              const arr=[...(form.internal?.stockBySite||[]), { site:'', qty:0 }];
              setForm({...form, internal:{ ...(form.internal||{}), stockBySite:arr }});
            }}>+ Row</Button>
            {isAdmin && <Button variant="contained" style={{marginLeft:8}} onClick={save}>Save</Button>}
          </div>
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
