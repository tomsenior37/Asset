// client/src/services/api.js
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

/** Canonical axios instance (many files do: import { api } from './api') */
export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

// Attach JWT if present
api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem('assetdb_token') ||
    localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* =========================================================
   Helpers
   ========================================================= */
const toList = (data) => (Array.isArray(data) ? data : (data?.items ?? data ?? []));
const tryPatchThenPut = async (url, payload) => {
  try {
    const { data } = await api.patch(url, payload);
    return data;
  } catch (e) {
    // fallback if server uses PUT instead of PATCH
    const { data } = await api.put(url, payload);
    return data;
  }
};

/* =========================================================
   Clients / Sites / Areas
   ========================================================= */
export async function getClients() {
  const { data } = await api.get('/clients');
  return toList(data);
}
export async function listClients(params = {}) {
  const { data } = await api.get('/clients', { params });
  return toList(data);
}

export async function getClientSites(clientId) {
  const { data } = await api.get(`/clients/${clientId}/sites`);
  return toList(data);
}
export async function createSite(clientId, payload) {
  const { data } = await api.post(`/clients/${clientId}/sites`, payload);
  return data;
}

/** Optional legacy: some pages still ask for a "location tree". Return [] if not supported. */
export async function getLocationTree(clientId) {
  try {
    const { data } = await api.get(`/clients/${clientId}/locations/tree`);
    return toList(data);
  } catch {
    return [];
  }
}

/* =========================================================
   Sites / Areas
   ========================================================= */
export async function getSite(siteId) {
  const { data } = await api.get(`/sites/${siteId}`);
  return data;
}
export async function getSiteAreas(siteId, params = {}) {
  const { data } = await api.get(`/sites/${siteId}/areas`, { params });
  return toList(data);
}
export async function createArea(siteId, payload) {
  const { data } = await api.post(`/sites/${siteId}/areas`, payload);
  return data;
}

/* =========================================================
   Suppliers
   ========================================================= */
export async function listSuppliers(params = {}) {
  const { data } = await api.get('/suppliers', { params });
  return toList(data);
}
export async function createSupplier(payload) {
  const { data } = await api.post('/suppliers', payload);
  return data;
}

/* =========================================================
   Parts
   ========================================================= */
export async function listParts(params = {}) {
  const { data } = await api.get('/parts', { params });
  return toList(data);
}
export async function createPart(payload) {
  const { data } = await api.post('/parts', payload);
  return data;
}

/* =========================================================
   Assets
   ========================================================= */
export async function listAssets(params = {}) {
  const { data } = await api.get('/assets', { params });
  return toList(data);
}
export async function createAsset(payload) {
  const { data } = await api.post('/assets', payload);
  return data;
}
export async function getAsset(assetId) {
  const { data } = await api.get(`/assets/${assetId}`);
  return data;
}
export async function updateAsset(assetId, payload) {
  return await tryPatchThenPut(`/assets/${assetId}`, payload);
}
export async function uploadAssetAttachment(assetId, file) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post(`/assets/${assetId}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/* =========================================================
   Legacy alias some code used
   ========================================================= */
export { api as http };
