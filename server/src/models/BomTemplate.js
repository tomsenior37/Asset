import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

const BomLineSchema = new mongoose.Schema({
  part: { type: ObjectId, ref: 'Part', default: null },
  partName: { type: String, default: '' },
  partNo: { type: String, default: '' },
  qty: { type: Number, default: 1, min: 0 },
  unit: { type: String, default: 'ea' },
  notes: { type: String, default: '' }
}, { _id: false });

const BomTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  client: { type: ObjectId, ref: 'Client', default: null }, // null = global
  category: { type: String, default: '' }, // optional tag
  lines: { type: [BomLineSchema], default: [] }
}, { timestamps: true });

BomTemplateSchema.index({ name: 'text', category: 'text' });

export default mongoose.model('BomTemplate', BomTemplateSchema);
