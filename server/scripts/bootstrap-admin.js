// server/scripts/bootstrap-admin.js
// CLI one-shot seeding (alternative to the HTTP bootstrap route)
const { MongoClient } = require('mongodb');

(async () => {
  try {
    const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:27017/assetdb';
    const email = (process.argv[2] || '').trim().toLowerCase();
    const pass = process.argv[3] || '';
    if (!email || !pass) {
      console.error('Usage: node scripts/bootstrap-admin.js <email> <password>');
      process.exit(1);
    }

    let bcrypt;
    try { bcrypt = require('bcryptjs'); } catch { bcrypt = require('bcrypt'); }
    const passwordHash = await bcrypt.hash(pass, 10);

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

    // if ANY user exists, do nothing
    const any = await col.findOne({});
    if (any) {
      console.log('Users already exist; aborting seed.');
      await client.close();
      process.exit(0);
    }

    const now = new Date();
    await col.updateOne(
      { email },
      {
        $set: {
          email,
          role: 'admin',
          isActive: true,
          password: passwordHash,
          passwordHash,
          hash: passwordHash,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true }
    );
    console.log(`Bootstrapped admin: ${email}`);
    await client.close();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
