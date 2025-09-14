// server/src/appRoutes.js
const express = require('express');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { usersCollection } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-prod';
const router = express.Router();

// ---- helpers ----
const toPublicUser = (u) => ({
  id: String(u._id),
  email: u.email,
  role: u.role || 'user',
  isActive: u.isActive !== false,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

// ---- auth middleware ----
// expects Authorization: Bearer <token>
async function requireAuth(req, res, next) {
  try {
    const h = String(req.headers.authorization || '');
    const m = h.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ error: 'missing token' });

    const payload = jwt.verify(m[1], JWT_SECRET);
    req.auth = payload;

    // fetch fresh user doc (in case role/status changed)
    try {
      const col = await usersCollection();
      const u = await col.findOne({ _id: new ObjectId(payload.id) });
      if (!u || u.isActive === false) return res.status(403).json({ error: 'account disabled' });
      req.user = u;
    } catch {
      // if lookup fails, still carry the JWT payload
      req.user = { _id: payload.id, email: payload.email, role: payload.role, isActive: true };
    }

    return next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

// ---- routes ----

// GET /api/auth/me  -> current user
router.get('/auth/me', requireAuth, async (req, res) => {
  return res.json({ user: toPublicUser(req.user) });
});

// GET /api/clients  -> placeholder until real data exists
// (kept open or protect it with requireAuth if your UI expects auth)
router.get('/clients', requireAuth, async (_req, res) => {
  // TODO: replace with real DB collection when you add it
  return res.json({ items: [] });
});

module.exports = router;
