// server/scripts/bootstrap-admin.js
const { MongoClient } = require('mongodb');

(async () => {
  try {
    const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:27017/assetdb';
    const email = (process.argv[2] || '').trim().toLowerCase();
    const password = process.argv[3] || '';
    if (!email || !password) {
      console.error('Usage: node scripts/bootstrap-admin.js <email> <password>');
      process.exit(1);
    }

    // Try to require bcryptjs, then bcrypt
    let bcrypt;
    try { bcrypt = require('bcryptjs'); } catch (_) {
      try { bcrypt = require('bcrypt'); } catch (e) {
        console.error('Need bcryptjs or bcrypt in server deps.');
        process.exit(1);
      }
    }
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const client = new MongoClient(MONGO_URL, { ignoreUndefined: true });
    await client.connect();
    const dbName = MONGO_URL.split('/').pop().split('?')[0] || 'assetdb';
    const db = client.db(dbName);

    // Try common collection names
    const candidates = ['users', 'user', 'accounts'];
    let col;
    for (const name of candidates) {
      const names = await db.listCollections().toArray();
      const exists = names.some(n => n.name === name);
      if (exists || name === 'users') { col = db.collection(name); break; }
    }
    if (!col) col = db.collection('users');

    // Common schemas differ; set both password & passwordHash
    const now = new Date();
    const doc = {
      email,
      role: 'admin',
      password: passwordHash,
      passwordHash,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };

    // Upsert by email
    const res = await col.updateOne(
      { email },
      { $setOnInsert: doc },
      { upsert: true }
    );

    if (res.upsertedCount || (res.matchedCount && res.modifiedCount === 0)) {
      console.log(`Admin ensured: ${email}`);
    } else if (res.matchedCount) {
      console.log(`User existed: ${email} (no changes)`);
    } else {
      console.log('No changes made.');
    }
    await client.close();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
