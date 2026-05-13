import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IConversation extends Document {
  _id: Types.ObjectId;
  type: 'direct';
  participants: Types.ObjectId[];
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    type: { type: String, enum: ['direct'], default: 'direct' },
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      validate: [(val: Types.ObjectId[]) => val.length === 2, 'Direct conversation requires exactly 2 participants'],
      required: true,
    },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ConversationSchema.index({ participants: 1 });

export const Conversation = mongoose.model<IConversation>(
  'Conversation',
  ConversationSchema
);
