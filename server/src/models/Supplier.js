import mongoose from 'mongoose';

const SupplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true, uppercase: true, unique: true },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  website: { type: String, default: '' },
  address: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('Supplier', SupplierSchema);
