import { Message, Conversation, User } from '../models';
import { conversationsService } from './conversations.service';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import type { SendMessageInput } from '../validators/messages.validator';

export class MessagesService {
  async sendMessage(senderId: string, input: SendMessageInput) {
    // Verify user is participant
    await conversationsService.getConversationById(
      input.conversationId,
      senderId
    );

    const sender = await User.findById(senderId).select('publicKey').lean();

    const message = await Message.create({
      conversationId: input.conversationId,
      senderId,
      receiverId: input.receiverId,
      senderPublicKey: sender?.publicKey || '',
      encryptedPayload: input.encryptedPayload,
      nonce: input.nonce,
    });

    Conversation.findByIdAndUpdate(input.conversationId, {
      lastMessageAt: new Date(),
    }).catch(() => {});

    return message;
  }

  async getConversationMessages(
    conversationId: string,
    userId: string,
    page = 1,
    limit = 50
  ) {
    await conversationsService.getConversationById(conversationId, userId);

    const skip = (page - 1) * limit;
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return messages.reverse();
  }

  async markDelivered(messageId: string, userId: string) {
    const message = await Message.findById(messageId);
    if (!message) throw new NotFoundError('Message not found');
    if (message.receiverId.toString() !== userId) {
      throw new ForbiddenError('Not authorized');
    }
    if (message.status === 'sent') {
      message.status = 'delivered';
      await message.save();
    }
    return message;
  }

  async markRead(messageId: string, userId: string) {
    const message = await Message.findById(messageId);
    if (!message) throw new NotFoundError('Message not found');
    if (message.receiverId.toString() !== userId) {
      throw new ForbiddenError('Not authorized');
    }
    message.status = 'read';
    await message.save();
    return message;
  }
}

export const messagesService = new MessagesService();
