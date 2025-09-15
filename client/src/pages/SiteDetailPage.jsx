// client/src/pages/SiteDetailPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSite, getSiteAreas, createArea } from '../services/api.js';

function Tab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px',
        marginRight: 8,
        border: '1px solid #ccc',
        background: active ? '#1976d2' : '#fafafa',
        color: active ? '#fff' : '#333',
        borderRadius: 4,
        cursor: 'pointer'
      }}
    >
      {children}
    </button>
  );
}

export default function SiteDetailPage() {
  const { siteId } = useParams();
  const [site, setSite] = useState(null);
  const [areas, setAreas] = useState([]);
  const [tab, setTab] = useState('areas');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [areaForm, setAreaForm] = useState({ name: '', code: '' });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr('');
        const s = await getSite(siteId);
        setSite(s);
        const list = await getSiteAreas(siteId);
        setAreas(Array.isArray(list) ? list : (list.items || []));
      } catch (e) {
        console.error(e);
        setErr('Failed to load site');
      } finally {
        setLoading(false);
      }
    })();
  }, [siteId]);

  async function onAddArea(e) {
    e.preventDefault();
    try {
      if (!areaForm.name.trim() || !areaForm.code.trim()) {
        setErr('Enter area name and code'); return;
      }
      await createArea(siteId, { name: areaForm.name.trim(), code: areaForm.code.trim() });
      const list = await getSiteAreas(siteId);
      setAreas(Array.isArray(list) ? list : (list.items || []));
      setAreaForm({ name: '', code: '' });
    } catch (e) {
      console.error(e);
      setErr('Failed to create area');
    }
  }

  return (
    <div className="container">
      <h2>Site</h2>
      {site ? (
        <p style={{color:'#444'}}><b>{site.name}</b>{site.code ? ` • ${site.code}` : ''}</p>
      ) : loading ? <p>Loading…</p> : null}

      <div style={{marginBottom: 12}}>
        <Tab active={tab === 'areas'} onClick={() => setTab('areas')}>Areas</Tab>
      </div>

      {err && <p style={{color:'crimson'}}>{err}</p>}

      {tab === 'areas' && (
        <div>
          <form onSubmit={onAddArea} style={{marginBottom: 14}}>
            <input
              style={{width: 220}}
              placeholder="New area name"
              value={areaForm.name}
              onChange={(e) => setAreaForm(s => ({...s, name: e.target.value}))}
            />
            {' '}
            <input
              style={{width: 120}}
              placeholder="Code"
              value={areaForm.code}
              onChange={(e) => setAreaForm(s => ({...s, code: e.target.value}))}
            />
            {' '}
            <button type="submit">Add Area</button>
          </form>

          {loading ? <p>Loading…</p> : (
            areas.length === 0 ? (
              <p>No areas yet.</p>
            ) : (
              <table className="table" style={{minWidth: 600}}>
                <thead>
                  <tr><th>Name</th><th>Code</th></tr>
                </thead>
                <tbody>
                  {areas.map((a) => (
                    <tr key={a._id || a.id}>
                      <td>{a.name}</td>
                      <td>{a.code || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      )}
    </div>
  );
}
