import mongoose from 'mongoose';

const ClientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Client', ClientSchema);
