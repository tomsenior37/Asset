import mongoose from 'mongoose';
import 'dotenv/config.js';
import bcrypt from 'bcryptjs';
import Client from '../src/models/Client.js';
import Location from '../src/models/Location.js';
import Asset from '../src/models/Asset.js';
import User from '../src/models/User.js';
import Supplier from '../src/models/Supplier.js';
import Part from '../src/models/Part.js';
import BomTemplate from '../src/models/BomTemplate.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/assetdb';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Seeding...');

  await Promise.all([
    Client.deleteMany({}), Location.deleteMany({}), Asset.deleteMany({}),
    User.deleteMany({}), Supplier.deleteMany({}), Part.deleteMany({}), BomTemplate.deleteMany({})
  ]);

  await User.create({
    name: 'Admin',
    email: 'admin@example.com',
    passwordHash: await bcrypt.hash('admin123', 10),
    role: 'admin'
  });

  const alcoa = await Client.create({ name: 'Alcoa', code: 'ALCOA' });

  const site = await Location.create({ client: alcoa._id, name: 'Wagerup OC7', code: 'WG-OC7', kind: 'site' });
  const area = await Location.create({ client: alcoa._id, name: 'Pump Room 1', code: 'PR1', kind: 'area', parent: site._id });
  await area.save();

  const sup1 = await Supplier.create({ name: 'Acme Pumps', code: 'ACME' });
  const sup2 = await Supplier.create({ name: 'SealTech', code: 'SEAL' });

  const seal = await Part.create({
    internalSku: 'INT-MS-50',
    name: 'Mechanical Seal 50mm',
    category: 'Seals',
    unit: 'ea',
    supplierOptions: [
      { supplier: sup2._id, supplierSku: 'ST-MS50', price: 120.0, currency: 'USD', leadTimeDays: 7, preferred: true }
    ],
    internal: { standardCost: 95, stockBySite: [{ site: site._id, qty: 4 }] }
  });

  const impeller = await Part.create({
    internalSku: 'INT-IMP-200',
    name: 'Impeller 200mm',
    category: 'Impellers',
    unit: 'ea',
    supplierOptions: [
      { supplier: sup1._id, supplierSku: 'AC-IMP200', price: 450.0, currency: 'USD', leadTimeDays: 21 }
    ],
    internal: { standardCost: 400, stockBySite: [{ site: site._id, qty: 1 }] }
  });

  const asset = await Asset.create({
    client: alcoa._id,
    location: area._id,
    name: 'Process Pump 001',
    tag: 'P-001',
    category: 'Pumps',
    model: 'KSB Etanorm 50-200',
    serial: 'SN123456',
    status: 'active',
    notes: 'Baseline asset seeded',
    bom: [
      { part: seal._id, qty: 1, unit: 'ea', notes: 'preferred' },
      { part: impeller._id, qty: 1, unit: 'ea' },
      { partName: 'Gasket 50mm', qty: 2, unit: 'ea' }
    ],
    supplier: 'Acme Pumps',
  });

  console.log('Admin login: admin@example.com / admin123');
  console.log('Done.');
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});


  // Create a global pump template
  await BomTemplate.create({
    name: 'Standard Pump BOM',
    category: 'pump',
    client: null,
    lines: [
      { part: (await Part.findOne({ internalSku: 'INT-MS-50' }))._id, qty: 1, unit: 'ea', notes: 'seal' },
      { part: (await Part.findOne({ internalSku: 'INT-IMP-200' }))._id, qty: 1, unit: 'ea', notes: 'impeller' }
    ]
  });

  // Create a client-scoped variant
  await BomTemplate.create({
    name: 'Wagerup Pump Service Kit',
    client: (await Client.findOne({ code: 'ALCOA' }))._id,
    category: 'service-kit',
    lines: [
      { partName: 'Gasket Set', qty: 1, unit: 'set' },
      { partName: 'Bearing 6205', qty: 2, unit: 'ea' }
    ]
  });

  console.log('Seeded example BOM templates.');
