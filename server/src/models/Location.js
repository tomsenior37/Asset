import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

const LocationSchema = new mongoose.Schema(
  {
    client: { type: ObjectId, ref: 'Client', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    kind: { type: String, enum: ['site', 'area'], default: 'site' },
    parent: { type: ObjectId, ref: 'Location', default: null },
    path: [{ type: ObjectId, ref: 'Location', index: true }],
  },
  { timestamps: true }
);

LocationSchema.index({ client: 1, parent: 1, code: 1 }, { unique: true });

LocationSchema.pre('save', async function (next) {
  if (!this.isModified('parent')) return next();
  if (!this.parent) { this.path = []; return next(); }
  const parent = await this.constructor.findById(this.parent).lean();
  if (!parent) return next(new Error('Parent location not found'));
  this.path = [...(parent.path || []), parent._id];
  next();
});

LocationSchema.statics.treeForClient = async function (clientId) {
  const rows = await this.find({ client: clientId }).sort({ createdAt: 1 }).lean();
  const byId = Object.fromEntries(rows.map(r => [String(r._id), { ...r, children: [] }]));
  const roots = [];
  for (const r of rows) {
    if (r.parent) {
      const p = byId[String(r.parent)];
      if (p) p.children.push(byId[String(r._id)]);
    } else {
      roots.push(byId[String(r._id)]);
    }
  }
  return roots;
};

export default mongoose.model('Location', LocationSchema);
