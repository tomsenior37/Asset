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

const statuses = [
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
    jobNumber: { type: String, required: true, trim: true, unique: true, index: true },
    poNumber:  { type: String, default: '', trim: true, index: true },

    client:   { type: ObjectId, ref: 'Client', required: true, index: true },
    location: { type: ObjectId, ref: 'Location', default: null, index: true },
    asset:    { type: ObjectId, ref: 'Asset', default: null, index: true },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },

    startDate: { type: Date, default: null },

    status: { type: String, enum: statuses, default: 'investigate_quote', index: true },

    resources: { type: [ResourceSchema], default: [] }
  },
  { timestamps: true }
);

JobSchema.index({ jobNumber: 1 });
JobSchema.index({ poNumber: 1 });
JobSchema.index({ title: 'text', description: 'text' });

export const JOB_STATUSES = statuses;
export default mongoose.model('Job', JobSchema);
