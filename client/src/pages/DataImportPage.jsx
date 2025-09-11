import React, { useState } from 'react';
import { Button, Select, MenuItem, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';

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
  const [preview, setPreview] = useState(null); // { template, rows:[{rowIndex,ok,action,message}], summary:{} }
  const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

  function templateUrl(){ return `${apiBase}/api/imports/template/${type}`; }

  async function postCSV(dryRun){
    if (!file) { alert('Choose a CSV file first'); return; }
    const buf = await file.arrayBuffer();
    const res = await fetch(`${apiBase}/api/imports/${type}${dryRun?'?dry_run=1':''}`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('assetdb_token')||'') },
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
        {keys.map(k => (
          <Chip key={k} label={`${k}: ${summary[k]}`} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h2>Data Import</h2>
        <p>Pick a type, download its CSV template, then upload for a dry-run preview. If everything looks good, click Import.</p>
        <div className="row" style={{gap:12, flexWrap:'wrap'}}>
          <Select value={type} onChange={e=>{ setType(e.target.value); setPreview(null); setFile(null); }}>
            {TYPES.map(t => <MenuItem key={t.v} value={t.v}>{t.label}</MenuItem>)}
          </Select>
          <a href={templateUrl()} target="_blank" rel="noreferrer">
            <Button variant="outlined">Download template</Button>
          </a>

          <label>
            <input type="file" accept=".csv,text/csv" style={{display:'none'}}
                   onChange={e=>{ setFile(e.target.files?.[0] || null); setPreview(null); }}/>
            <Button variant="outlined" component="span">{file ? `File: ${file.name}` : 'Choose CSV'}</Button>
          </label>

          <Button variant="contained" onClick={()=>postCSV(true)} disabled={!file}>Validate (dry-run)</Button>
          <Button variant="contained" color="success" onClick={()=>postCSV(false)} disabled={!file}>Import</Button>
        </div>
      </div>

      <div className="card">
        <h3>Preview / Validation</h3>
        {!preview && <p><em>No preview yet. Use “Validate (dry-run)”.</em></p>}
        {preview && (
          <>
            <Summary summary={preview.summary} />
            {!!(preview.template||[]).length && (
              <p><small>Template columns: {preview.template.join(', ')}</small></p>
            )}
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>OK</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Message</TableCell>
                </TableRow>
              </TableHead>
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

      <div className="card">
        <h3>Notes</h3>
        <ul style={{marginTop:0}}>
          <li>“Validate (dry-run)” checks references (e.g., <em>client_code</em>, <em>location_code</em>) and required fields without writing.</li>
          <li>“Import” performs upserts; existing rows update, new rows insert.</li>
          <li>For **Locations**: <em>site</em> rows have no parent; <em>area</em> rows require a valid <em>parent_code</em> (site).</li>
          <li>For **Jobs**: <em>status</em> is validated; unknown values default to <em>investigate_quote</em>.</li>
        </ul>
      </div>
    </div>
  );
}
