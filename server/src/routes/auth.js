import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { name='', email, password, role='user' } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const userCount = await User.countDocuments();
  if (userCount > 0 && role === 'admin') {
    return res.status(403).json({ error: 'Cannot self-assign admin once users exist' });
  }
  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ error: 'email already registered' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, role: userCount === 0 ? 'admin' : role });
  res.status(201).json({ _id: user._id, email: user.email, role: user.role });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });
  const token = jwt.sign({ sub: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'devsecret_change_me', { expiresIn: '7d' });
  res.json({ token, user: { email: user.email, role: user.role, name: user.name } });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
