// client/src/services/api.js
import axios from 'axios';

// Vite build arg (compose passes this). Defaults to /api for nginx proxy.
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

/**
 * Canonical axios instance for the app.
 * We name it `api` to match existing imports in the codebase:
 *   import { api } from './api';
 */
export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

// Attach token automatically if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('assetdb_token') || localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ----- Convenience wrappers (use if you prefer function calls) -----
export async function getClients() {
  const { data } = await api.get('/clients');
  // If backend returns { items: [...] }, normalize here:
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

// Optional alias for legacy code that imported `http`
export { api as http };
