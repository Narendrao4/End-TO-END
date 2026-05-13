import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFriendship extends Document {
  _id: Types.ObjectId;
  users: [Types.ObjectId, Types.ObjectId];
  createdAt: Date;
}

const FriendshipSchema = new Schema<IFriendship>(
  {
    users: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      validate: [(val: Types.ObjectId[]) => val.length === 2, 'Friendship requires exactly 2 users'],
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

FriendshipSchema.index({ users: 1 });

export const Friendship = mongoose.model<IFriendship>(
  'Friendship',
  FriendshipSchema
);
