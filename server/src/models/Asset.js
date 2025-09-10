import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

const AttachmentSchema = new mongoose.Schema({
  filename: String,
  originalname: String,
  size: Number,
  mimetype: String,
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const BomItemSchema = new mongoose.Schema(
  {
    part: { type: ObjectId, ref: 'Part', default: null },
    partName: { type: String, default: '', trim: true },
    partNo: { type: String, default: '', trim: true },
    qty: { type: Number, default: 1, min: 0 },
    unit: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { _id: false }
);

const AssetSchema = new mongoose.Schema(
  {
    client: { type: ObjectId, ref: 'Client', required: true, index: true },
    location: { type: ObjectId, ref: 'Location', required: true, index: true },
    name: { type: String, required: true, trim: true },
    tag: { type: String, default: '', trim: true },
    category: { type: String, default: '', trim: true },
    model: { type: String, default: '', trim: true },
    serial: { type: String, default: '', trim: true },
    status: { type: String, enum: ['active', 'spare', 'retired', 'missing'], default: 'active' },
    notes: { type: String, default: '' },

    // BOM & docs
    bom: { type: [BomItemSchema], default: [] },
    attachments: { type: [AttachmentSchema], default: [] },

    // NEW: main photo is a filename from attachments
    mainPhoto: { type: String, default: '' },

    purchaseDate: { type: Date },
    supplier: { type: String, default: '' },
  },
  { timestamps: true }
);

AssetSchema.index(
  { client: 1, serial: 1 },
  { unique: true, partialFilterExpression: { serial: { $type: 'string', $ne: '' } } }
);
AssetSchema.index({ name: 'text', tag: 'text', model: 'text', serial: 'text', category: 'text' });

export default mongoose.model('Asset', AssetSchema);
