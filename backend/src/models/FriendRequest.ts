import mongoose, { Schema, Document, Types } from 'mongoose';

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface IFriendRequest extends Document {
  _id: Types.ObjectId;
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  status: FriendRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

const FriendRequestSchema = new Schema<IFriendRequest>(
  {
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

FriendRequestSchema.index({ senderId: 1, receiverId: 1 }, { unique: true });
FriendRequestSchema.index({ receiverId: 1, status: 1 });

export const FriendRequest = mongoose.model<IFriendRequest>(
  'FriendRequest',
  FriendRequestSchema
);
