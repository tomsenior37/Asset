// server/src/index.js
const express = require('express');
const cors = require('cors');
let bcrypt;
try { bcrypt = require('bcryptjs'); } catch { bcrypt = require('bcrypt'); }

const { usersCollection } = require('./db');
const authRoutes = require('./authRoutes');
const appRoutes = require('./appRoutes');

const PORT = process.env.PORT || 4000;
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'TempPass!123';

const app = express();
app.use(cors());
app.use(express.json());

// health first
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// auth endpoints (login)
app.use('/api', authRoutes);

// application endpoints (auth/me, clients, etc)
app.use('/api', appRoutes);

// one-time seed on startup if zero users
(async () => {
  try {
    const col = await usersCollection();
    const count = await col.estimatedDocumentCount();
    if (count === 0) {
      const now = new Date();
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await col.updateOne(
        { email: ADMIN_EMAIL },
        {
          $set: {
            email: ADMIN_EMAIL,
            role: 'admin',
            isActive: true,
            password: passwordHash,
            passwordHash,
            hash: passwordHash,
            createdAt: now,
            updatedAt: now
          }
        },
        { upsert: true }
      );
      console.log(`[seed] bootstrapped admin ${ADMIN_EMAIL}`);
    } else {
      console.log(`[seed] users present: ${count}, skipping`);
    }
  } catch (e) {
    console.error('[seed] failed:', e);
  }
})();

app.listen(PORT, '0.0.0.0', () => console.log(`Server on :${PORT}`));

module.exports = app;
