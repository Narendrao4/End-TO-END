import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMfaSecret extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  secret: string;
  backupCodes: string[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MfaSecretSchema = new Schema<IMfaSecret>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    secret: { type: String, required: true },
    backupCodes: [{ type: String }],
    enabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const MfaSecret = mongoose.model<IMfaSecret>('MfaSecret', MfaSecretSchema);
