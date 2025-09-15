// client/src/pages/ClientDetailPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { getClientSites, createSite } from '../services/api.js';

function TabButton({ active, children, onClick }) {
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

export default function ClientDetailPage() {
  const { clientId } = useParams();
  const [params, setParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(params.get('tab') || 'sites');
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [siteForm, setSiteForm] = useState({ name: '', code: '' });
  const navigate = useNavigate();

  useEffect(() => {
    setParams({ tab: activeTab }, { replace: true });
  }, [activeTab]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr('');
        const list = await getClientSites(clientId);
        setSites(Array.isArray(list) ? list : (list.items || []));
      } catch (e) {
        console.error(e);
        setErr('Failed to load sites');
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  async function onAddSite(e) {
    e.preventDefault();
    try {
      if (!siteForm.name.trim() || !siteForm.code.trim()) {
        setErr('Enter site name and code'); return;
      }
      await createSite(clientId, { name: siteForm.name.trim(), code: siteForm.code.trim() });
      const list = await getClientSites(clientId);
      setSites(Array.isArray(list) ? list : (list.items || []));
      setSiteForm({ name: '', code: '' });
    } catch (e) {
      console.error(e);
      setErr('Failed to create site');
    }
  }

  return (
    <div className="container">
      <h2>Client</h2>
      <div style={{marginBottom: 12}}>
        <TabButton active={activeTab === 'sites'} onClick={() => setActiveTab('sites')}>Sites</TabButton>
        {/* Add more tabs here later if needed */}
      </div>

      {err && <p style={{color:'crimson'}}>{err}</p>}

      {activeTab === 'sites' && (
        <div>
          <form onSubmit={onAddSite} style={{marginBottom: 14}}>
            <input
              style={{width: 220}}
              placeholder="New site name"
              value={siteForm.name}
              onChange={(e) => setSiteForm(s => ({...s, name: e.target.value}))}
            />
            {' '}
            <input
              style={{width: 120}}
              placeholder="Code"
              value={siteForm.code}
              onChange={(e) => setSiteForm(s => ({...s, code: e.target.value}))}
            />
            {' '}
            <button type="submit">Add Site</button>
          </form>

          {loading ? <p>Loading…</p> : (
            sites.length === 0 ? (
              <p>No sites yet.</p>
            ) : (
              <table className="table" style={{minWidth: 600}}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Code</th>
                    <th style={{width: 160}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.map((s) => (
                    <tr key={s._id || s.id}>
                      <td>{s.name}</td>
                      <td>{s.code || '-'}</td>
                      <td>
                        <button onClick={() => navigate(`/clients/${clientId}/sites/${s._id || s.id}`)}>
                          Open Site
                        </button>
                      </td>
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
