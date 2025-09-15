import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

const ResourceSchema = new mongoose.Schema(
  {
    person: { type: String, required: true, trim: true },
    role:   { type: String, default: '', trim: true },
    hours:  { type: Number, default: 0, min: 0 },
    date:   { type: Date, default: null },
    notes:  { type: String, default: '' }
  },
  { _id: true, timestamps: true }
);

const AttachmentSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['rcs','correspondence','supplier_quote','other'], default: 'other', index: true },
    filename: String,
    originalname: String,
    size: Number,
    mimetype: String,
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

export const JOB_STATUSES = [
  'investigate_quote',
  'quoted',
  'po_received',
  'awaiting_parts',
  'parts_received',
  'require_plan_date',
  'planned',
  'in_progress',
  'invoice'
];

const JobSchema = new mongoose.Schema(
  {
    // core identifiers
    jobNumber: { type: String, required: true, trim: true, unique: true, index: true }, // 5-digit in UI
    poNumber:  { type: String, default: '', trim: true, index: true },

    // relations
    client:   { type: ObjectId, ref: 'Client', required: true, index: true },
    location: { type: ObjectId, ref: 'Location', default: null, index: true },
    asset:    { type: ObjectId, ref: 'Asset', default: null, index: true },

    // descriptions & dates
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    startDate: { type: Date, default: null },   // from RCS
    quoteDueDate: { type: Date, default: null },// when quote due

    status: { type: String, enum: JOB_STATUSES, default: 'investigate_quote', index: true },

    // buckets
    attachments: { type: [AttachmentSchema], default: [] },
    resources:   { type: [ResourceSchema], default: [] }
  },
  { timestamps: true }
);

JobSchema.index({ title: 'text', description: 'text' });
export default mongoose.model('Job', JobSchema);
