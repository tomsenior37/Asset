// server/src/db.js
const { MongoClient } = require('mongodb');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:27017/assetdb';

let _client;
let _db;

async function connect() {
  if (_db) return _db;
  _client = new MongoClient(MONGO_URL, { ignoreUndefined: true });
  await _client.connect();
  const dbName = MONGO_URL.split('/').pop().split('?')[0] || 'assetdb';
  _db = _client.db(dbName);
  return _db;
}

async function usersCollection() {
  const db = await connect();
  // Prefer existing collection names, default to 'users'
  const names = (await db.listCollections().toArray()).map(n => n.name);
  const colName = names.includes('users')
    ? 'users'
    : (names.includes('accounts') ? 'accounts' : 'users');
  return db.collection(colName);
}

module.exports = { connect, usersCollection };
