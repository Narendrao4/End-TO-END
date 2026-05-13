import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILoginAttempt extends Document {
  _id: Types.ObjectId;
  email: string;
  ip: string;
  success: boolean;
  userAgent?: string;
  createdAt: Date;
}

const LoginAttemptSchema = new Schema<ILoginAttempt>(
  {
    email: { type: String, required: true, index: true },
    ip: { type: String, required: true, index: true },
    success: { type: Boolean, required: true },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

// Auto-delete old login attempts after 24 hours
LoginAttemptSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export const LoginAttempt = mongoose.model<ILoginAttempt>('LoginAttempt', LoginAttemptSchema);
