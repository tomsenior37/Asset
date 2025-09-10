import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

const SupplierOptionSchema = new mongoose.Schema({
  supplier: { type: ObjectId, ref: 'Supplier', required: true },
  supplierSku: { type: String, default: '' },
  price: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  leadTimeDays: { type: Number, default: 0 },
  moq: { type: Number, default: 1 },
  preferred: { type: Boolean, default: false },
}, { _id: false });

const PartSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  internalSku: { type: String, required: true, trim: true, unique: true },
  category: { type: String, default: '', trim: true },
  unit: { type: String, default: '', trim: true },
  specs: { type: Object, default: {} },
  notes: { type: String, default: '' },

  supplierOptions: { type: [SupplierOptionSchema], default: [] },

  // INTERNAL stock is now a single scalar (no per-site stock)
  internal: {
    onHand: { type: Number, default: 0, min: 0 },
    standardCost: { type: Number, default: 0 },
    reorderPoint: { type: Number, default: 0 },
    reorderQty: { type: Number, default: 0 }
  }
}, { timestamps: true });

PartSchema.index({ name: 'text', internalSku: 'text', category: 'text' });

export default mongoose.model('Part', PartSchema);
