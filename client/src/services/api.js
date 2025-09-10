import axios from 'axios';

const base = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
export const api = axios.create({ baseURL: base + '/api' });

function getToken() { return localStorage.getItem('assetdb_token') || ''; }
api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = 'Bearer ' + t;
  return config;
});

/* -------------------- Clients -------------------- */
export async function listClients() {
  const { data } = await api.get('/clients'); return data;
}
export async function createClient(payload){
  const { data } = await api.post('/clients', payload); return data;
}

/* -------------------- Locations -------------------- */
export async function getLocationTree(clientId){
  const { data } = await api.get(`/clients/${clientId}/locations/tree`); return data;
}
export async function createLocation(clientId, payload){
  const { data } = await api.post(`/clients/${clientId}/locations`, payload); return data;
}

/* -------------------- Suppliers -------------------- */
export async function listSuppliers(){
  const { data } = await api.get('/suppliers'); return data;
}
export async function createSupplier(payload){
  const { data } = await api.post('/suppliers', payload); return data;
}

/* -------------------- Parts -------------------- */
export async function listParts(params){
  const { data } = await api.get('/parts', { params }); return data;
}
export async function createPart(payload){
  const { data } = await api.post('/parts', payload); return data;
}

/* -------------------- Assets -------------------- */
export async function listAssets(params){
  const { data } = await api.get('/assets', { params }); return data;
}
export async function createAsset(payload){
  const { data } = await api.post('/assets', payload); return data;
}
export async function getAsset(id){
  const { data } = await api.get('/assets/' + id); return data;
}
export async function updateAsset(id, payload){
  const { data } = await api.patch('/assets/' + id, payload); return data;
}

/* ---- Asset Attachments + Main Photo ---- */
export async function listAssetAttachments(id) {
  const { data } = await api.get(`/assets/${id}/attachments`); return data;
}
export async function uploadAssetAttachment(id, file){
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post(`/assets/${id}/attachments`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}
export async function deleteAssetAttachment(id, filename) {
  const { data } = await api.delete(`/assets/${id}/attachments/${filename}`); return data;
}
export async function setMainPhoto(id, filename) {
  const { data } = await api.post(`/assets/${id}/main-photo`, { filename }); return data;
}

/* -------------------- BOM Templates -------------------- */
export async function listBomTemplates(params){
  const { data } = await api.get('/bom-templates', { params }); return data;
}
export async function createBomTemplate(payload){
  const { data } = await api.post('/bom-templates', payload); return data;
}
export async function updateBomTemplate(id, payload){
  const { data } = await api.patch('/bom-templates/' + id, payload); return data;
}
export async function deleteBomTemplate(id){
  const { data } = await api.delete('/bom-templates/' + id); return data;
}

/* ---- Apply template / Clone BOM to asset ---- */
export async function applyTemplateToAsset(assetId, { templateId, mode='append' }){
  const { data } = await api.post(`/assets/${assetId}/apply-template`, { templateId, mode });
  return data;
}
export async function cloneBomFromAsset(assetId, { fromAssetId, mode='append' }){
  const { data } = await api.post(`/assets/${assetId}/clone-bom`, { fromAssetId, mode });
  return data;
}

/* -------------------- Auth -------------------- */
export async function login(email, password){
  const { data } = await api.post('/auth/login', { email, password });
  localStorage.setItem('assetdb_token', data.token);
  return data;
}
export async function me(){
  const { data } = await api.get('/auth/me', {
    headers: { Authorization: 'Bearer ' + getToken() }
  });
  return data.user;
}
export function logout(){ localStorage.removeItem('assetdb_token'); }
