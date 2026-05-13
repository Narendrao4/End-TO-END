import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IInviteLink extends Document {
  _id: Types.ObjectId;
  creatorId: Types.ObjectId;
  code: string;
  expiresAt: Date;
  maxUses: number;
  uses: number;
  usedBy: Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const InviteLinkSchema = new Schema<IInviteLink>(
  {
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    code: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    maxUses: { type: Number, default: 0 }, // 0 = unlimited
    uses: { type: Number, default: 0 },
    usedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

InviteLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const InviteLink = mongoose.model<IInviteLink>(
  'InviteLink',
  InviteLinkSchema
);
