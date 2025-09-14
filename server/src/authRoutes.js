const express = require('express');
const jwt = require('jsonwebtoken');
let bcrypt;
try { bcrypt = require('bcryptjs'); } catch { bcrypt = require('bcrypt'); }
const { usersCollection } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-prod';

const router = express.Router();

const norm = s => String(s || '').trim().toLowerCase();
const getHash = u => u?.passwordHash || u?.password || u?.hash || null;
const pub = u => ({
  id: String(u._id),
  email: u.email,
  role: u.role || 'user',
  isActive: u.isActive !== false,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt
});

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
  try {
    const email = norm(req.body?.email);
    const password = req.body?.password;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const col = await usersCollection();
    const user = await col.findOne({ email });
    if (!user || user.isActive === false) return res.status(401).json({ error: 'invalid credentials' });

    const ok = await bcrypt.compare(password, getHash(user) || '');
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });

    const token = jwt.sign(pub(user), JWT_SECRET, { expiresIn: '12h' });
    return res.json({ token, user: pub(user) });
  } catch (e) {
    console.error('[auth/login]', e);
    return res.status(500).json({ error: 'login failed' });
  }
});

module.exports = router;
