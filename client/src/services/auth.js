// client/src/services/auth.js
import { api } from './api';

const TOKEN_KEY = 'assetdb_token';

/**
 * Login and persist JWT
 */
export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  if (data?.token) {
    localStorage.setItem(TOKEN_KEY, data.token);
  }
  return data; // { token, user }
}

/**
 * Current user (plain user object)
 * Backend route: GET /auth/me -> { ...user }
 */
export async function me() {
  const { data } = await api.get('/auth/me');
  return data;
}

/**
 * Remove token (legacy alias: clearToken)
 */
export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Token helpers
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function isAuthenticated() {
  return !!getToken();
}

/**
 * Default export for modules that import the whole service
 */
export default {
  login,
  me,
  logout,
  clearToken,
  getToken,
  isAuthenticated,
};
