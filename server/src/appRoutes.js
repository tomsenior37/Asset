// server/src/appRoutes.js
const express = require('express');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { usersCollection } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-prod';
const router = express.Router();

const toPublicUser = (u) => ({
  id: String(u._id),
  email: u.email,
  role: u.role || 'user',
  isActive: u.isActive !== false,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

// ---- auth middleware (Authorization: Bearer <token>) ----
async function requireAuth(req, res, next) {
  try {
    const h = String(req.headers.authorization || '');
    const m = h.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ error: 'missing token' });

    const payload = jwt.verify(m[1], JWT_SECRET);

    // refresh user from DB (best effort)
    try {
      const col = await usersCollection();
      const u = await col.findOne({ _id: new ObjectId(payload.id) });
      if (!u || u.isActive === false) return res.status(403).json({ error: 'account disabled' });
      req.user = u;
    } catch {
      req.user = { _id: payload.id, email: payload.email, role: payload.role, isActive: true };
    }
    next();
  } catch {
    res.status(401).json({ error: 'invalid token' });
  }
}

// ---- expected shapes ----

// GET /api/auth/me   --> plain user object (NO wrapper)
router.get('/auth/me', requireAuth, async (req, res) => {
  return res.json(toPublicUser(req.user));
});

// GET /api/clients   --> plain array (NO wrapper)
// Also stub a few common collections so UI pages don’t explode
const arrayStubs = ['/clients', '/locations', '/areas', '/sites', '/assets'];
arrayStubs.forEach((p) => {
  router.get(p, requireAuth, async (_req, res) => res.json([]));
});

// As a final safety net: any other GET /api/* returns an empty array
// (kept AFTER explicit routes; won’t affect POST /api/auth/login since that’s on authRoutes)
router.get('*', requireAuth, async (_req, res) => res.json([]));

module.exports = router;
