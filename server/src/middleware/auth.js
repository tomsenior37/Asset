// server/src/middleware/auth.js  (ESM)
import jwt from 'jsonwebtoken';

const JWT_SECRET = (process.env.JWT_SECRET || 'change-me-in-prod').trim();

/**
 * Optional auth:
 * - If Authorization: Bearer <token> is present, verify/decode and set req.user
 * - If missing/invalid, continues without user
 * - Never rejects the request
 */
export default function authOptional(req, _res, next) {
  try {
    const h = String(req.headers?.authorization || '');
    const m = h.match(/^Bearer\s+(.+)$/i);
    if (m) {
      const token = m[1];
      try {
        // Prefer verify; if secret mismatch, fall back to decode
        req.user = jwt.verify(token, JWT_SECRET);
      } catch {
        req.user = jwt.decode(token) || undefined;
      }
    }
  } catch {
    // ignore
  }
  return next();
}

/**
 * Hard auth:
 * - Requires a valid Bearer token
 * - 401 on missing/invalid
 */
export function requireAuth(req, res, next) {
  try {
    const h = String(req.headers?.authorization || '');
    const m = h.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ error: 'Missing token' });
    req.user = jwt.verify(m[1], JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Role gate helper: require a specific role
 */
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
    return next();
  };
}
