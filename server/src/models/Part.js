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

const StockBySiteSchema = new mongoose.Schema({
  site: { type: ObjectId, ref: 'Location', required: true }, // kind='site'
  qty: { type: Number, default: 0, min: 0 }
}, { _id: false });

const PartSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  internalSku: { type: String, required: true, trim: true, unique: true },
  category: { type: String, default: '', trim: true },
  unit: { type: String, default: '', trim: true },
  specs: { type: Object, default: {} },
  notes: { type: String, default: '' },
  supplierOptions: { type: [SupplierOptionSchema], default: [] },
  internal: {
    standardCost: { type: Number, default: 0 },
    reorderPoint: { type: Number, default: 0 },
    reorderQty: { type: Number, default: 0 },
    stockBySite: { type: [StockBySiteSchema], default: [] }
  }
}, { timestamps: true });

PartSchema.index({ name: 'text', internalSku: 'text', category: 'text' });

export default mongoose.model('Part', PartSchema);
