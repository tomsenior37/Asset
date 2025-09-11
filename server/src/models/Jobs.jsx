import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

const JobSchema = new mongoose.Schema(
  {
    asset: { type: ObjectId, ref: 'Asset', required: true, index: true },
    client: { type: ObjectId, ref: 'Client', required: true, index: true },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },

    status: { type: String, enum: ['open', 'in_progress', 'done', 'cancelled'], default: 'open', index: true },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal', index: true },

    dueDate: { type: Date, default: null },

    // lightweight assignee/creator (text for now; can switch to User ref later)
    assignee: { type: String, default: '' },
    createdBy: { type: String, default: '' }
  },
  { timestamps: true }
);

export default mongoose.model('Job', JobSchema);
