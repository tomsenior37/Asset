// client/src/services/api.js
import axios from 'axios';

// Vite build arg (compose passes this). Defaults to /api for nginx proxy.
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

/**
 * Canonical axios instance for the app.
 * Many pages do:  import { api } from './api'
 */
export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

// Attach token automatically if present (supports legacy key names)
api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem('assetdb_token') ||
    localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* =========================================================
   Clients / Sites / Areas
   ========================================================= */
export async function getClients() {
  const { data } = await api.get('/clients');
  return Array.isArray(data) ? data : (data.items ?? data);
}

export async function getClientSites(clientId) {
  const { data } = await api.get(`/clients/${clientId}/sites`);
  return Array.isArray(data) ? data : (data.items ?? data);
}

export async function createSite(clientId, payload) {
  const { data } = await api.post(`/clients/${clientId}/sites`, payload);
  return data;
}

export async function getSite(siteId) {
  const { data } = await api.get(`/sites/${siteId}`);
  return data;
}

export async function getSiteAreas(siteId) {
  const { data } = await api.get(`/sites/${siteId}/areas`);
  return Array.isArray(data) ? data : (data.items ?? data);
}

export async function createArea(siteId, payload) {
  const { data } = await api.post(`/sites/${siteId}/areas`, payload);
  return data;
}

/* =========================================================
   Suppliers  (matches: import { listSuppliers, createSupplier } ...)
   ========================================================= */
export async function listSuppliers(params = {}) {
  const { data } = await api.get('/suppliers', { params });
  return Array.isArray(data) ? data : (data.items ?? data);
}

export async function createSupplier(payload) {
  const { data } = await api.post('/suppliers', payload);
  return data;
}

/* =========================================================
   Parts  (prevent next missing-export errors)
   ========================================================= */
export async function listParts(params = {}) {
  const { data } = await api.get('/parts', { params });
  return Array.isArray(data) ? data : (data.items ?? data);
}

export async function createPart(payload) {
  const { data } = await api.post('/parts', payload);
  return data;
}

/* =========================================================
   Assets  (prevent next missing-export errors)
   ========================================================= */
export async function listAssets(params = {}) {
  const { data } = await api.get('/assets', { params });
  return Array.isArray(data) ? data : (data.items ?? data);
}

export async function createAsset(payload) {
  const { data } = await api.post('/assets', payload);
  return data;
}

/* =========================================================
   Legacy alias some code uses
   ========================================================= */
export { api as http };
