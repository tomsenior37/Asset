// server/src/bootstrapRoute.js
//
// Mounts POST /api/bootstrap/admin ONLY when ENABLE_BOOTSTRAP=1.
// Creates the first admin user if none exist, then you should disable it.

const { MongoClient } = require('mongodb');

module.exports = function bootstrapRoute(app) {
  const {
    ENABLE_BOOTSTRAP,
    MONGO_URL = 'mongodb://mongo:27017/assetdb',
    BOOTSTRAP_ADMIN_EMAIL,
    BOOTSTRAP_ADMIN_PASSWORD,
  } = process.env;

  if (String(ENABLE_BOOTSTRAP) !== '1') return; // disabled by default

  const express = require('express'); // lazy import
  const router = express.Router();

  router.post('/bootstrap/admin', async (_req, res) => {
    try {
      if (!BOOTSTRAP_ADMIN_EMAIL || !BOOTSTRAP_ADMIN_PASSWORD) {
        return res.status(400).json({ error: 'Missing BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD' });
      }

      let bcrypt;
      try { bcrypt = require('bcryptjs'); } catch { bcrypt = require('bcrypt'); }
      const passwordHash = await bcrypt.hash(BOOTSTRAP_ADMIN_PASSWORD, 10);

      const client = new MongoClient(MONGO_URL);
      await client.connect();

      const dbName = MONGO_URL.split('/').pop().split('?')[0] || 'assetdb';
      const db = client.db(dbName);
      const names = await db.listCollections().toArray();

      const collectionName =
        (names.find(n => n.name === 'users')?.name) ||
        (names.find(n => n.name === 'accounts')?.name) ||
        'users';

      const col = db.collection(collectionName);

      // If ANY user exists, do nothing (safety)
      const someone = await col.findOne({});
      if (someone) {
        await client.close();
        return res.status(409).json({ error: 'Users already exist' });
      }

      const now = new Date();
      await col.updateOne(
        { email: BOOTSTRAP_ADMIN_EMAIL.toLowerCase() },
        {
          $set: {
            email: BOOTSTRAP_ADMIN_EMAIL.toLowerCase(),
            role: 'admin',
            isActive: true,
            // write to multiple common fields so your auth code will match one of them
            password: passwordHash,
            passwordHash,
            hash: passwordHash,
            createdAt: now,
            updatedAt: now,
          },
        },
        { upsert: true }
      );

      await client.close();
      return res.json({ ok: true, email: BOOTSTRAP_ADMIN_EMAIL.toLowerCase() });
    } catch (e) {
      console.error('[bootstrapRoute] failed:', e);
      return res.status(500).json({ error: 'bootstrap failed' });
    }
  });

  app.use('/api', router);
  console.log('[bootstrapRoute] /api/bootstrap/admin enabled (remember to disable after use)');
};
