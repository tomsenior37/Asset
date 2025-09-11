import 'dotenv/config.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import Client from '../src/models/Client.js';
import Location from '../src/models/Location.js';
import Asset from '../src/models/Asset.js';
import Supplier from '../src/models/Supplier.js';
import Part from '../src/models/Part.js';
import User from '../src/models/User.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/assetdb';

async function upsert(model, where, update) {
  const doc = await model.findOneAndUpdate(where, { $set: update }, { upsert: true, new: true });
  return doc;
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Seeding (safe)…');

  // Admin user
  const adminEmail = 'admin@example.com';
  const adminPass = 'admin123';
  const hash = await bcrypt.hash(adminPass, 10);
  await upsert(User, { email: adminEmail }, { email: adminEmail, name: 'Admin', role: 'admin', passwordHash: hash });
  console.log('Admin ensured:', adminEmail);

  // Client
  const client = await upsert(Client,
    { code: 'ALCOA' },
    {
      name: 'Alcoa',
      code: 'ALCOA',
      addressLine1: '123 Example Rd',
      city: 'Wagerup',
      state: 'WA',
      postcode: '6208',
      country: 'AU',
      contactName: 'Plant Contact',
      phone: '+61 8 0000 0000',
      email: 'plant@example.com',
      website: 'https://example.com'
    });

  // Locations
  const site = await upsert(Location,
    { client: client._id, code: 'WG-OC7', kind: 'site', parent: null },
    { name: 'Wagerup OC7', code: 'WG-OC7', kind: 'site', parent: null, client: client._id });
  // ensure path fix
  await Location.updateOne({ _id: site._id }, { $set: { path: [] } });
  const area = await upsert(Location,
    { client: client._id, code: 'PR1', kind: 'area', parent: site._id },
    { name: 'Pump Room 1', code: 'PR1', kind: 'area', parent: site._id, client: client._id });

  // Suppliers
  const sup1 = await upsert(Supplier, { code: 'ACME' }, { name: 'Acme Pumps', code: 'ACME' });
  const sup2 = await upsert(Supplier, { code: 'SEAL' }, { name: 'SealTech', code: 'SEAL' });

  // Parts
  const seal = await upsert(Part, { internalSku: 'INT-MS-50' }, {
    name: 'Mechanical Seal 50mm',
    category: 'Seals',
    unit: 'ea',
    supplierOptions: [
      { supplier: sup2._id, supplierSku: 'ST-MS50', price: 120, currency: 'USD', leadTimeDays: 7, preferred: true }
    ],
    internal: { onHand: 4, standardCost: 95, reorderPoint: 1, reorderQty: 1 }
  });

  const impeller = await upsert(Part, { internalSku: 'INT-IMP-200' }, {
    name: 'Impeller 200mm',
    category: 'Impellers',
    unit: 'ea',
    supplierOptions: [
      { supplier: sup1._id, supplierSku: 'AC-IMP200', price: 450, currency: 'USD', leadTimeDays: 21 }
    ],
    internal: { onHand: 1, standardCost: 400, reorderPoint: 1, reorderQty: 1 }
  });

  // Asset
  await upsert(Asset, { tag: 'P-001' }, {
    client: client._id,
    location: area._id,
    name: 'Process Pump 001',
    tag: 'P-001',
    category: 'Pumps',
    model: 'KSB Etanorm 50-200',
    serial: 'SN123456',
    status: 'active',
    notes: 'Seeded asset',
    bom: [
      { part: seal._id, qty: 1, unit: 'ea', notes: 'seal' },
      { part: impeller._id, qty: 1, unit: 'ea' }
    ]
  });

  console.log('Seed (safe) complete.');
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
