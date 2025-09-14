// server/src/authRoutes.js
const express = require('express');
const jwt = require('jsonwebtoken');

let bcrypt;
try { bcrypt = require('bcryptjs'); } catch { bcrypt = require('bcrypt'); }

const { usersCollection } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-prod';
const ENABLE_REGISTRATION = String(process.env.ENABLE_REGISTRATION || '0') === '1';

const router = express.Router();

// helper: normalize email to lowercase
function normEmail(e) {
  return String(e || '').trim().toLowerCase();
}

// helper: read any known password field
function getStoredHash(u) {
  return u?.passwordHash || u?.password || u?.hash || null;
}

// helper: select safe payload for token
function toPublicUser(u) {
  return {
    id: String(u._id),
    email: u.email,
    role: u.role || 'user',
    isActive: u.isActive !== false,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const e = normEmail(email);
    if (!e || !password) return res.status(400).json({ error: 'email and password required' });

    const col = await usersCollection();
    const user = await col.findOne({ email: e });
    if (!user) return res.status(401).json({ error: 'invalid credentials' });
    if (user.isActive === false) return res.status(403).json({ error: 'account disabled' });

    const stored = getStoredHash(user);
    if (!stored) return res.status(401).json({ error: 'invalid credentials' });

    const ok = await bcrypt.compare(password, stored);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });

    const payload = toPublicUser(user);
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
    return res.json({ token, user: payload });
  } catch (e) {
    console.error('[auth/login] error', e);
    return res.status(500).json({ error: 'login failed' });
  }
});

// POST /api/auth/register
// Allowed IFF ENABLE_REGISTRATION=1 OR there are currently zero users.
// Designed for first boot / manual seeding; disable afterward.
router.post('/auth/register', async (req, res) => {
  try {
    const { email, password, role } = req.body || {};
    const e = normEmail(email);
    if (!e || !password) return res.status(400).json({ error: 'email and password required' });

    const col = await usersCollection();
    const count = await col.estimatedDocumentCount();

    if (!(ENABLE_REGISTRATION || count === 0)) {
      return res.status(403).json({ error: 'registration disabled' });
    }

    const existing = await col.findOne({ email: e });
    if (existing) return res.status(409).json({ error: 'email already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();
    const doc = {
      email: e,
      role: role || (count === 0 ? 'admin' : 'user'),
      isActive: true,
      // write all common fields for maximum compatibility
      password: passwordHash,
      passwordHash,
      hash: passwordHash,
      createdAt: now,
      updatedAt: now,
    };
    const ins = await col.insertOne(doc);
    const user = { ...doc, _id: ins.insertedId };

    const payload = toPublicUser(user);
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
    return res.status(201).json({ token, user: payload });
  } catch (e) {
    console.error('[auth/register] error', e);
    return res.status(500).json({ error: 'register failed' });
  }
});

module.exports = router;
