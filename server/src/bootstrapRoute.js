// server/src/bootstrapRoute.js
const express = require('express');
const { MongoClient } = require('mongodb');

module.exports = function bootstrapRoute(app) {
  const { ENABLE_BOOTSTRAP, MONGO_URL, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD } = process.env;
  if (String(ENABLE_BOOTSTRAP) !== '1') return;

  const router = express.Router();

  router.post('/bootstrap/admin', async (req, res) => {
    try {
      if (!BOOTSTRAP_ADMIN_EMAIL || !BOOTSTRAP_ADMIN_PASSWORD) {
        return res.status(400).json({ error: 'Missing bootstrap envs' });
      }
      let bcrypt;
      try { bcrypt = require('bcryptjs'); } catch { bcrypt = require('bcrypt'); }
      const passwordHash = await bcrypt.hash(BOOTSTRAP_ADMIN_PASSWORD, 10);

      const client = new MongoClient(MONGO_URL || 'mongodb://mongo:27017/assetdb');
      await client.connect();
      const dbName = (MONGO_URL || 'mongodb://mongo:27017/assetdb').split('/').pop().split('?')[0];
      const db = client.db(dbName);
      const names = await db.listCollections().toArray();
      const colName = names.some(n => n.name === 'users') ? 'users' : (names.some(n => n.name === 'accounts') ? 'accounts' : 'users');
      const col = db.collection(colName);

      const already = await col.findOne({});
      if (already) {
        await client.close();
        return res.status(409).json({ error: 'Users already exist' });
      }

      const now = new Date();
      await col.updateOne(
        { email: BOOTSTRAP_ADMIN_EMAIL.toLowerCase() },
        { $set: {
          email: BOOTSTRAP_ADMIN_EMAIL.toLowerCase(),
          role: 'admin',
          isActive: true,
          password: passwordHash,
          passwordHash,
          hash: passwordHash,
          createdAt: now,
          updatedAt: now
        }},
        { upsert: true }
      );

      await client.close();
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'bootstrap failed' });
    }
  });

  app.use('/api', router);
};
