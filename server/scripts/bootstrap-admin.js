// server/scripts/bootstrap-admin.js
const { MongoClient } = require('mongodb');

async function main() {
  const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:27017/assetdb';
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
  const pass = process.env.BOOTSTRAP_ADMIN_PASSWORD || '';
  if (!email || !pass) {
    console.error('Missing BOOTSTRAP_ADMIN_EMAIL or BOOTSTRAP_ADMIN_PASSWORD');
    process.exit(1);
  }

  // prefer bcryptjs, fallback to bcrypt
  let bcrypt;
  try { bcrypt = require('bcryptjs'); } catch {
    try { bcrypt = require('bcrypt'); } catch {
      console.error('Install bcryptjs or bcrypt in server dependencies.');
      process.exit(1);
    }
  }
  const passwordHash = await bcrypt.hash(pass, 10);

  const client = new MongoClient(MONGO_URL, { ignoreUndefined: true });
  await client.connect();

  const dbName = MONGO_URL.split('/').pop().split('?')[0] || 'assetdb';
  const db = client.db(dbName);

  // pick collection (default to users)
  const colNames = await db.listCollections().toArray();
  const target =
    (colNames.find(c => c.name === 'users')?.name) ||
    (colNames.find(c => c.name === 'accounts')?.name) ||
    'users';
  const users = db.collection(target);

  // if ANY user exists, do nothing
  const existing = await users.findOne({});
  if (existing) {
    console.log('Users already exist, skipping bootstrap.');
    await client.close();
    return;
  }

  const now = new Date();
  const doc = {
    email, role: 'admin', isActive: true,
    // set all common fields so whatever your code expects will match
    password: passwordHash,
    passwordHash,
    hash: passwordHash,
    createdAt: now, updatedAt: now
  };
  await users.updateOne({ email }, { $set: doc }, { upsert: true });
  console.log(`Bootstrapped admin: ${email}`);
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
