// client/src/pages/ClientsPage.jsx
import React, { useEffect, useState } from 'react';
import { getClients, createSite } from '../services/api.js';
import { useNavigate } from 'react-router-dom';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingFor, setAddingFor] = useState(null); // clientId
  const [siteForm, setSiteForm] = useState({ name: '', code: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const list = await getClients();
        setClients(Array.isArray(list) ? list : (list.items || []));
      } catch (e) {
        console.error(e);
        setError('Failed to load clients');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function submitAddSite(clientId) {
    try {
      setError('');
      if (!siteForm.name.trim() || !siteForm.code.trim()) {
        setError('Please enter both site name and code');
        return;
      }
      await createSite(clientId, { name: siteForm.name.trim(), code: siteForm.code.trim() });
      // after adding, go to client detail "Sites" view
      navigate(`/clients/${clientId}`);
    } catch (e) {
      console.error(e);
      setError('Failed to create site');
    }
  }

  if (loading) return <div className="container"><h2>Clients</h2><p>Loading…</p></div>;
  return (
    <div className="container">
      <h2>Clients</h2>
      {error && <p style={{color:'crimson'}}>{error}</p>}
      {clients.length === 0 ? (
        <p>No clients found.</p>
      ) : (
        <table className="table" style={{minWidth: 600}}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th style={{width: 280}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c._id || c.id}>
                <td>
                  <a href={`/clients/${c._id || c.id}`}>{c.name}</a>
                </td>
                <td>{c.code || c.clientCode || '-'}</td>
                <td>
                  <button onClick={() => navigate(`/clients/${c._id || c.id}`)}>Open</button>
                  {' '}
                  {addingFor === (c._id || c.id) ? (
                    <span style={{marginLeft: 12}}>
                      <input
                        style={{width: 140}}
                        placeholder="Site name"
                        value={siteForm.name}
                        onChange={(e) => setSiteForm(s => ({...s, name: e.target.value}))}
                      />
                      {' '}
                      <input
                        style={{width: 100}}
                        placeholder="Code"
                        value={siteForm.code}
                        onChange={(e) => setSiteForm(s => ({...s, code: e.target.value}))}
                      />
                      {' '}
                      <button onClick={() => submitAddSite(c._id || c.id)}>Save</button>
                      {' '}
                      <button onClick={() => { setAddingFor(null); setSiteForm({name:'', code:''}); }}>Cancel</button>
                    </span>
                  ) : (
                    <button style={{marginLeft: 8}} onClick={() => setAddingFor(c._id || c.id)}>
                      Add Site
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
