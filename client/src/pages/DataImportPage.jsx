import React, { useState } from 'react';
import {
  Button, Select, MenuItem, Table, TableHead, TableRow, TableCell, TableBody, Chip, TextField
} from '@mui/material';

const TYPES = [
  { v:'clients',        label:'Clients' },
  { v:'locations',      label:'Locations' },
  { v:'assets',         label:'Assets' },
  { v:'parts',          label:'Parts' },
  { v:'suppliers',      label:'Suppliers' },
  { v:'supplier_parts', label:'Supplier Parts' },
  { v:'jobs',           label:'Jobs' },
];

export default function DataImportPage(){
  const [type, setType] = useState('clients');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  // Wizard states
  const [locSource, setLocSource] = useState(null);
  const [locPreview, setLocPreview] = useState(null);
  const [wizardClientCode, setWizardClientCode] = useState(''); // optional
  const [assetSource, setAssetSource] = useState(null);
  const [assetPreview, setAssetPreview] = useState(null);
  const [assetOutputClientCode, setAssetOutputClientCode] = useState('');

  const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
  const token = localStorage.getItem('assetdb_token') || '';

  function templateUrl(){ return `${apiBase}/api/imports/template/${type}`; }
  function exportUrl(){ return `${apiBase}/api/exports/${type}`; }

  async function postCSV(dryRun){
    if (!file) { alert('Choose a CSV file first'); return; }
    const buf = await file.arrayBuffer();
    const res = await fetch(`${apiBase}/api/imports/${type}${dryRun?'?dry_run=1':''}`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body: buf
    });
    const json = await res.json();
    if(!res.ok){ alert(json.error || 'Upload failed'); return; }
    setPreview(json);
  }

  function Summary({summary}){
    if(!summary) return null;
    const keys = Object.keys(summary);
    return (
      <div style={{display:'flex', gap:12, flexWrap:'wrap', margin:'8px 0'}}>
        {keys.map(k => (<Chip key={k} label={`${k}: ${summary[k]}`} />))}
      </div>
    );
  }

  async function wizardPreviewLocations(){
    if(!locSource){ alert('Choose a Locations source CSV'); return; }
    const buf = await locSource.arrayBuffer();
    const url = `${apiBase}/api/imports/wizard/locations?preview=1${wizardClientCode ? `&client_code=${encodeURIComponent(wizardClientCode)}` : ''}`;
    const res = await fetch(url, { method:'POST', headers: { 'Authorization':'Bearer '+token }, body: buf });
    const json = await res.json();
    if(!res.ok){ alert(json.error || 'Locations preview failed'); return; }
    setLocPreview(json);
  }
  async function wizardDownloadLocations(){
    if(!locSource){ alert('Choose a Locations source CSV'); return; }
    const buf = await locSource.arrayBuffer();
    const url = `${apiBase}/api/imports/wizard/locations${wizardClientCode ? `?client_code=${encodeURIComponent(wizardClientCode)}` : ''}`;
    const res = await fetch(url, { method:'POST', headers: { 'Authorization':'Bearer '+token }, body: buf });
    if(!res.ok){ const j=await res.json().catch(()=>({})); alert(j.error||'Download failed'); return; }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'locations.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function wizardPreviewAssets(){
    if(!assetSource){ alert('Choose an Assets source CSV'); return; }
    const buf = await assetSource.arrayBuffer();
    const params = new URLSearchParams();
    params.set('preview','1');
    params.set('use_db_locations','1'); // ensure only known/mapped locations
    if (assetOutputClientCode) params.set('client_code', assetOutputClientCode.toUpperCase());
    const url = `${apiBase}/api/imports/wizard/assets?${params.toString()}`;
    const res = await fetch(url, { method:'POST', headers: { 'Authorization':'Bearer '+token }, body: buf });
    const json = await res.json();
    if(!res.ok){ alert(json.error || 'Assets preview failed'); return; }
    setAssetPreview(json);
  }
  async function wizardDownloadAssets(){
    if(!assetSource){ alert('Choose an Assets source CSV'); return; }
    const buf = await assetSource.arrayBuffer();
    const params = new URLSearchParams();
    params.set('use_db_locations','1');
    if (assetOutputClientCode) params.set('client_code', assetOutputClientCode.toUpperCase());
    const url = `${apiBase}/api/imports/wizard/assets?${params.toString()}`;
    const res = await fetch(url, { method:'POST', headers: { 'Authorization':'Bearer '+token }, body: buf });
    if(!res.ok){ const j=await res.json().catch(()=>({})); alert(j.error||'Download failed'); return; }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'assets.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      {/* Export */}
      <div className="card">
        <h2>Export CSV</h2>
        <div className="row" style={{gap:12, flexWrap:'wrap'}}>
          <Select value={type} onChange={e=>{ setType(e.target.value); }}>
            {TYPES.map(t => <MenuItem key={t.v} value={t.v}>{t.label}</MenuItem>)}
          </Select>
          <a href={exportUrl()} target="_blank" rel="noreferrer">
            <Button variant="outlined">Download export</Button>
          </a>
          <a href={`${apiBase}/api/imports/template/${type}`} target="_blank" rel="noreferrer">
            <Button variant="outlined">Download template</Button>
          </a>
        </div>
      </div>

      {/* Standard Import with dry-run */}
      <div className="card">
        <h2>Import CSV (standard)</h2>
        <p>Pick a type, validate (dry-run), then Import.</p>
        <div className="row" style={{gap:12, flexWrap:'wrap'}}>
          <Select value={type} onChange={e=>{ setType(e.target.value); setPreview(null); setFile(null); }}>
            {TYPES.map(t => <MenuItem key={t.v} value={t.v}>{t.label}</MenuItem>)}
          </Select>

          <label>
            <input type="file" accept=".csv,text/csv" style={{display:'none'}}
                   onChange={e=>{ setFile(e.target.files?.[0] || null); setPreview(null); }}/>
            <Button variant="outlined" component="span">{file ? `File: ${file.name}` : 'Choose CSV'}</Button>
          </label>

          <Button variant="contained" onClick={()=>postCSV(true)} disabled={!file}>Validate (dry-run)</Button>
          <Button variant="contained" color="success" onClick={()=>postCSV(false)} disabled={!file}>Import</Button>
        </div>

        <div style={{marginTop:12}}>
          <h3>Preview / Validation</h3>
          {!preview && <p><em>No preview yet. Use dry-run.</em></p>}
          {preview && (
            <>
              <div style={{display:'flex', gap:12, flexWrap:'wrap', margin:'8px 0'}}>
                {Object.entries(preview.summary||{}).map(([k,v]) => (<Chip key={k} label={`${k}: ${v}`} />))}
              </div>
              {preview.template && <p><small>Template columns: {preview.template.join(', ')}</small></p>}
              <Table>
                <TableHead><TableRow><TableCell>#</TableCell><TableCell>OK</TableCell><TableCell>Action</TableCell><TableCell>Message</TableCell></TableRow></TableHead>
                <TableBody>
                  {(preview.rows||[]).map(r => (
                    <TableRow key={r.rowIndex}>
                      <TableCell>{r.rowIndex}</TableCell>
                      <TableCell>{r.ok ? '✔︎' : '✖︎'}</TableCell>
                      <TableCell>{r.action}</TableCell>
                      <TableCell>{r.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      </div>

      {/* Wizard: build our Locations CSV from arbitrary source */}
      <div className="card">
        <h2>Wizard: Build Locations CSV</h2>
        <p>Upload your source file (e.g., Snipe-IT style). Optionally force a client code if your file doesn’t include one.</p>
        <div className="row" style={{gap:12, flexWrap:'wrap'}}>
          <TextField label="Force client_code (optional)" value={wizardClientCode} onChange={e=>setWizardClientCode(e.target.value)} />
          <label>
            <input type="file" accept=".csv,text/csv" style={{display:'none'}} onChange={e=>setLocSource(e.target.files?.[0] || null)}/>
            <Button variant="outlined" component="span">{locSource ? `File: ${locSource.name}` : 'Choose CSV'}</Button>
          </label>
          <Button variant="contained" onClick={wizardPreviewLocations} disabled={!locSource}>Preview</Button>
          <Button variant="contained" color="success" onClick={wizardDownloadLocations} disabled={!locSource}>Download locations.csv</Button>
        </div>

        {locPreview && (
          <>
            <div style={{display:'flex', gap:12, flexWrap:'wrap', margin:'8px 0'}}>
              {Object.entries(locPreview.summary||{}).map(([k,v]) => (<Chip key={k} label={`${k}: ${v}`} />))}
            </div>
            <Table>
              <TableHead><TableRow><TableCell>#</TableCell><TableCell>OK</TableCell><TableCell>Message</TableCell></TableRow></TableHead>
              <TableBody>
                {(locPreview.rows||[]).map(r => (
                  <TableRow key={r.rowIndex}>
                    <TableCell>{r.rowIndex}</TableCell>
                    <TableCell>{r.ok ? '✔︎' : '✖︎'}</TableCell>
                    <TableCell>{r.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </div>

      {/* Wizard: build our Assets CSV (requires locations already mapped) */}
      <div className="card">
        <h2>Wizard: Build Assets CSV</h2>
        <p>Upload your assets source. We’ll include assets **only** where the location already exists in the database. Company/client in your file is ignored.</p>
        <div className="row" style={{gap:12, flexWrap:'wrap'}}>
          <TextField label="Output client_code in CSV (optional)" value={assetOutputClientCode} onChange={e=>setAssetOutputClientCode(e.target.value)} />
          <label>
            <input type="file" accept=".csv,text/csv" style={{display:'none'}} onChange={e=>setAssetSource(e.target.files?.[0] || null)}/>
            <Button variant="outlined" component="span">{assetSource ? `File: ${assetSource.name}` : 'Choose CSV'}</Button>
          </label>
          <Button variant="contained" onClick={wizardPreviewAssets} disabled={!assetSource}>Preview</Button>
          <Button variant="contained" color="success" onClick={wizardDownloadAssets} disabled={!assetSource}>Download assets.csv</Button>
        </div>

        {assetPreview && (
          <>
            <div style={{display:'flex', gap:12, flexWrap:'wrap', margin:'8px 0'}}>
              {Object.entries(assetPreview.summary||{}).map(([k,v]) => (<Chip key={k} label={`${k}: ${v}`} />))}
            </div>
            <Table>
              <TableHead><TableRow><TableCell>#</TableCell><TableCell>OK</TableCell><TableCell>Message</TableCell></TableRow></TableHead>
              <TableBody>
                {(assetPreview.rows||[]).map(r => (
                  <TableRow key={r.rowIndex}>
                    <TableCell>{r.rowIndex}</TableCell>
                    <TableCell>{r.ok ? '✔︎' : '✖︎'}</TableCell>
                    <TableCell>{r.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </div>
    </div>
  );
}
