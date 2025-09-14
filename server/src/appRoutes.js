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

// expects Authorization: Bearer <token>
async function requireAuth(req, res, next) {
  try {
    const h = String(req.headers.authorization || '');
    const m = h.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ error: 'missing token' });
    const payload = jwt.verify(m[1], JWT_SECRET);

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

// GET /api/auth/me
router.get('/auth/me', requireAuth, async (req, res) => {
  return res.json({ user: toPublicUser(req.user) });
});

// GET /api/clients  (placeholder)
router.get('/clients', requireAuth, async (_req, res) => {
  return res.json({ items: [] });
});

module.exports = router;
