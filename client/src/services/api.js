// client/src/services/api.js
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export const http = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

// Attach token if present
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---- Clients ----
export async function getClients() {
  const { data } = await http.get('/clients');
  // if your API returns { items: [...] } then change to: return data.items || [];
  return data;
}

export async function getClientSites(clientId) {
  const { data } = await http.get(`/clients/${clientId}/sites`);
  return data; // array expected
}

export async function createSite(clientId, payload) {
  const { data } = await http.post(`/clients/${clientId}/sites`, payload);
  return data;
}

// ---- Sites / Areas ----
export async function getSite(siteId) {
  const { data } = await http.get(`/sites/${siteId}`);
  return data;
}

export async function getSiteAreas(siteId) {
  const { data } = await http.get(`/sites/${siteId}/areas`);
  return data; // array expected
}

export async function createArea(siteId, payload) {
  const { data } = await http.post(`/sites/${siteId}/areas`, payload);
  return data;
}
