// server/src/authRoutes.js
const express = require('express');
const jwt = require('jsonwebtoken');
let bcrypt; try { bcrypt = require('bcryptjs'); } catch { bcrypt = require('bcrypt'); }
const { usersCollection } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-prod';
const ENABLE_REGISTRATION = String(process.env.ENABLE_REGISTRATION || '0') === '1';

const router = express.Router();
const norm = s => String(s || '').trim().toLowerCase();
const getHash = u => u?.passwordHash || u?.password || u?.hash || null;
const pub = u => ({ id: String(u._id), email: u.email, role: u.role || 'user', isActive: u.isActive !== false, createdAt: u.createdAt, updatedAt: u.updatedAt });

router.post('/auth/login', async (req, res) => {
  try {
    const email = norm(req.body?.email), password = req.body?.password;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const col = await usersCollection();
    const user = await col.findOne({ email });
    if (!user || user.isActive === false) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, getHash(user) || '');
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    const token = jwt.sign(pub(user), JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, user: pub(user) });
  } catch (e) {
    console.error('[auth/login]', e);
    res.status(500).json({ error: 'login failed' });
  }
});

router.post('/auth/register', async (req, res) => {
  try {
    const email = norm(req.body?.email), password = req.body?.password, role = req.body?.role;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const col = await usersCollection();
    const count = await col.estimatedDocumentCount();
    if (!(ENABLE_REGISTRATION || count === 0)) return res.status(403).json({ error: 'registration disabled' });
    if (await col.findOne({ email })) return res.status(409).json({ error: 'email already exists' });
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();
    const doc = { email, role: role || (count === 0 ? 'admin' : 'user'), isActive: true, password: passwordHash, passwordHash, hash: passwordHash, createdAt: now, updatedAt: now };
    const ins = await col.insertOne(doc);
    const user = { ...doc, _id: ins.insertedId };
    const token = jwt.sign(pub(user), JWT_SECRET, { expiresIn: '12h' });
    res.status(201).json({ token, user: pub(user) });
  } catch (e) {
    console.error('[auth/register]', e);
    res.status(500).json({ error: 'register failed' });
  }
});

module.exports = router;
