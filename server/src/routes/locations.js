import express from 'express';
import { z } from 'zod';
import Location from '../models/Location.js';
import Client from '../models/Client.js';
import Asset from '../models/Asset.js';
import { updateDescendantPaths } from '../utils/cascade.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  kind: z.enum(['site','area']).default('site'),
  parent: z.string().optional().nullable()
});

router.post('/clients/:clientId/locations', requireAuth, async (req, res) => {
  const client = await Client.findById(req.params.clientId);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const body = createSchema.parse(req.body);
  const loc = await Location.create({
    client: client._id,
    name: body.name,
    code: body.code,
    kind: body.kind,
    parent: body.parent || null
  });
  if (loc.parent) await loc.save();
  res.status(201).json(loc);
});

router.get('/clients/:clientId/locations/tree', async (req, res) => {
  const client = await Client.findById(req.params.clientId);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const tree = await Location.treeForClient(client._id);
  res.json(tree);
});

router.get('/locations/:id', async (req, res) => {
  const loc = await Location.findById(req.params.id).lean();
  if (!loc) return res.status(404).json({ error: 'Location not found' });
  res.json(loc);
});

router.patch('/locations/:id', requireAuth, async (req, res) => {
  const body = createSchema.partial().parse(req.body);
  const loc = await Location.findById(req.params.id);
  if (!loc) return res.status(404).json({ error: 'Location not found' });

  const parentChanged = 'parent' in body && String(body.parent || null) !== String(loc.parent || null);

  if (body.name !== undefined) loc.name = body.name;
  if (body.code !== undefined) loc.code = body.code;
  if (body.kind !== undefined) loc.kind = body.kind;
  if (parentChanged) loc.parent = body.parent || null;

  await loc.save();
  if (parentChanged) {
    await updateDescendantPaths(Location, loc._id);
  }
  res.json(loc);
});

router.delete('/locations/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const locId = req.params.id;
  const childCount = await Location.countDocuments({ parent: locId });
  const assetCount = await Asset.countDocuments({ location: locId });
  if (childCount || assetCount) {
    return res.status(400).json({ error: 'Location has children/assets; move or delete them first.' });
  }
  const out = await Location.findByIdAndDelete(locId);
  if (!out) return res.status(404).json({ error: 'Location not found' });
  res.json({ ok: true });
});

router.patch('/locations/:id/move-subtree', requireAuth, async (req, res) => {
  const { newParent = null } = req.body || {};
  const node = await Location.findById(req.params.id);
  if (!node) return res.status(404).json({ error: 'Location not found' });

  let parentDoc = null;
  if (newParent) {
    parentDoc = await Location.findById(newParent).lean();
    if (!parentDoc) return res.status(400).json({ error: 'newParent not found' });
    if (String(parentDoc.client) !== String(node.client)) {
      return res.status(400).json({ error: 'Cannot move across clients' });
    }
    const isDescendant = (parentDoc.path || []).map(String).includes(String(node._id)) || String(parentDoc._id) === String(node._id);
    if (isDescendant) return res.status(400).json({ error: 'Cannot move under own descendant' });
    if (node.kind === 'site') return res.status(400).json({ error: 'Sites cannot be nested under another parent' });
    if (parentDoc.kind !== 'site') return res.status(400).json({ error: 'Parent must be a site' });
  } else {
    if (node.kind !== 'site') return res.status(400).json({ error: 'Only sites can be moved to root' });
  }

  node.parent = newParent || null;
  await node.save();
  await updateDescendantPaths(Location, node._id);
  res.json({ ok: true });
});

export default router;
