import mongoose, { Schema, Document, Types } from 'mongoose';

export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface IMessage extends Document {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  senderPublicKey?: string;
  encryptedPayload: string;
  nonce: string;
  messageType: 'text';
  status: MessageStatus;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderPublicKey: { type: String, default: '' },
    encryptedPayload: { type: String, required: true },
    nonce: { type: String, required: true },
    messageType: { type: String, enum: ['text'], default: 'text' },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
    },
  },
  { timestamps: true }
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ receiverId: 1, status: 1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
