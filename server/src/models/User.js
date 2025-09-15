import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin','user'], default: 'user' }
}, { timestamps: true });

export default mongoose.model('User', UserSchema);
