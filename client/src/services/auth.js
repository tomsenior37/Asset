import { api } from './api';

const TOKEN_KEY = 'assetdb_token';

export function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
export function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }

export async function login(email, password){
  const { data } = await api.post('/auth/login', { email, password });
  setToken(data.token);
  return data;
}

export async function me(){
  const { data } = await api.get('/auth/me', { headers: { Authorization: 'Bearer ' + getToken() }});
  return data.user;
}
