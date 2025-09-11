import React, { useState } from 'react';
import { Button, Select, MenuItem } from '@mui/material';

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
  const [result, setResult] = useState(null);

  const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

  async function doUpload(file){
    if (!file) return;
    const buf = await file.arrayBuffer();
    const res = await fetch(`${apiBase}/api/imports/${type}`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('assetdb_token')||'') },
      body: buf
    });
    const json = await res.json();
    setResult(json);
  }

  function templateUrl(){
    return `${apiBase}/api/imports/template/${type}`;
  }

  return (
    <div>
      <div className="card">
        <h2>Data Import</h2>
        <p>Select a data type, download its CSV template, fill it, then upload.</p>
        <div className="row" style={{gap:12, flexWrap:'wrap'}}>
          <Select value={type} onChange={e=>{ setType(e.target.value); setResult(null); }}>
            {TYPES.map(t => <MenuItem key={t.v} value={t.v}>{t.label}</MenuItem>)}
          </Select>
          <a href={templateUrl()} target="_blank" rel="noreferrer">
            <Button variant="outlined">Download CSV template</Button>
          </a>
          <label>
            <input type="file" accept=".csv,text/csv" style={{display:'none'}}
                   onChange={e=>doUpload(e.target.files?.[0])}/>
            <Button variant="contained" component="span">Upload CSV</Button>
          </label>
        </div>
      </div>

      <div className="card">
        <h3>Result</h3>
        {!result && <p><em>No uploads yet.</em></p>}
        {result && (
          <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(result, null, 2)}</pre>
        )}
      </div>

      <div className="card">
        <h3>Template columns (reference)</h3>
        <ul style={{marginTop:0}}>
          <li><strong>Clients:</strong> code, name, notes, addressLine1, addressLine2, city, state, postcode, country, contactName, phone, email, website</li>
          <li><strong>Locations:</strong> client_code, kind(site|area), code, name, parent_code(optional for site; required for area)</li>
          <li><strong>Assets:</strong> client_code, location_code, name, tag, category, model, serial, status(active|spare|retired|missing), notes</li>
          <li><strong>Parts:</strong> internalSku, name, category, unit, notes, onHand, standardCost, reorderPoint, reorderQty</li>
          <li><strong>Suppliers:</strong> code, name, email, phone, website, address, notes</li>
          <li><strong>Supplier Parts:</strong> supplier_code, part_internalSku, supplierSku, price, currency, leadTimeDays, moq, preferred(true|false)</li>
          <li><strong>Jobs:</strong> jobNumber(5-digits), poNumber, client_code, location_code(optional), asset_tag(optional), title, description, startDate(YYYY-MM-DD), quoteDueDate(YYYY-MM-DD), status(…)</li>
        </ul>
      </div>
    </div>
  );
}
