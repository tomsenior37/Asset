// client/src/services/auth.js
import { api } from './api';

const TOKEN_KEY = 'assetdb_token';

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  if (data?.token) {
    localStorage.setItem(TOKEN_KEY, data.token);
  }
  return data; // { token, user }
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return !!getToken();
}

// For convenience if some code expects default
export default { login, logout, getToken, isAuthenticated };
