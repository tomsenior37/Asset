import axios from 'axios';

const base = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
export const api = axios.create({ baseURL: base + '/api' });

function getToken(){ return localStorage.getItem('assetdb_token') || ''; }
api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = 'Bearer ' + t;
  return config;
});

/* Clients */
export async function listClients(){ const { data } = await api.get('/clients'); return data; }
export async function createClient(payload){ const { data } = await api.post('/clients', payload); return data; }
export async function getClient(id){ const { data } = await api.get('/clients/' + id); return data; }
export async function updateClient(id, payload){ const { data } = await api.patch('/clients/' + id, payload); return data; }

/* Locations */
export async function getLocationTree(clientId){ const { data } = await api.get(`/clients/${clientId}/locations/tree`); return data; }
export async function createLocation(clientId, payload){ const { data } = await api.post(`/clients/${clientId}/locations`, payload); return data; }
export async function getLocation(id){ const { data } = await api.get('/locations/' + id); return data; }

/* Suppliers */
export async function listSuppliers(){ const { data } = await api.get('/suppliers'); return data; }
export async function createSupplier(payload){ const { data } = await api.post('/suppliers', payload); return data; }
export async function getSupplier(id){ const { data } = await api.get('/suppliers/' + id); return data; }
export async function updateSupplier(id, payload){ const { data } = await api.patch('/suppliers/' + id, payload); return data; }
export async function listSupplierParts(id, params){ const { data } = await api.get(`/suppliers/${id}/parts`, { params }); return data; }
export async function linkSupplierToPart(id, payload){ const { data } = await api.post(`/suppliers/${id}/link-part`, payload); return data; }
export async function unlinkSupplierFromPart(id, partId){ const { data } = await api.delete(`/suppliers/${id}/link-part/${partId}`); return data; }

/* Parts */
export async function listParts(params){ const { data } = await api.get('/parts', { params }); return data; }
export async function createPart(payload){ const { data } = await api.post('/parts', payload); return data; }
export async function getPart(id){ const { data } = await api.get('/parts/' + id); return data; }
export async function updatePart(id, payload){ const { data } = await api.patch('/parts/' + id, payload); return data; }

/* Assets */
export async function listAssets(params){ const { data } = await api.get('/assets', { params }); return data; }
export async function createAsset(payload){ const { data } = await api.post('/assets', payload); return data; }
export async function getAsset(id){ const { data } = await api.get('/assets/' + id); return data; }
export async function updateAsset(id, payload){ const { data } = await api.patch('/assets/' + id, payload); return data; }

/* Quick Asset (inline flows elsewhere) */
export async function createAssetQuick(payload){ const { data } = await api.post('/quick/assets', payload); return data; }

/* Asset attachments / main photo */
export async function listAssetAttachments(id){ const { data } = await api.get(`/assets/${id}/attachments`); return data; }
export async function uploadAssetAttachment(id, file){
  const fd = new FormData(); fd.append('file', file);
  const { data } = await api.post(`/assets/${id}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  return data;
}
export async function deleteAssetAttachment(id, filename){ const { data } = await api.delete(`/assets/${id}/attachments/${filename}`); return data; }
export async function setMainPhoto(id, filename){ const { data } = await api.post(`/assets/${id}/main-photo`, { filename }); return data; }

/* BOM templates / Jobs etc — keep any functions you already added here */

/* Auth */
export async function login(email, password){ const { data } = await api.post('/auth/login', { email, password }); localStorage.setItem('assetdb_token', data.token); return data; }
export async function me(){ const { data } = await api.get('/auth/me', { headers: { Authorization: 'Bearer ' + getToken() }}); return data.user; }
export function logout(){ localStorage.removeItem('assetdb_token'); }
