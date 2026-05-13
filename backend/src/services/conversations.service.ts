import { Conversation } from '../models';
import { friendsService } from './friends.service';
import { ForbiddenError, NotFoundError } from '../utils/errors';

export class ConversationsService {
  async getOrCreateDirect(userId: string, friendId: string) {
    const areFriends = await friendsService.areFriends(userId, friendId);
    if (!areFriends) {
      throw new ForbiddenError('You must be friends to start a conversation');
    }

    let conversation = await Conversation.findOne({
      type: 'direct',
      participants: { $all: [userId, friendId], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        type: 'direct',
        participants: [userId, friendId],
      });
    }

    return conversation.populate(
      'participants',
      'username avatar publicKey lastSeen'
    );
  }

  async getUserConversations(userId: string) {
    return Conversation.find({ participants: userId })
      .populate('participants', 'username avatar publicKey lastSeen')
      .sort({ lastMessageAt: -1 });
  }

  async getConversationById(conversationId: string, userId: string) {
    const conversation = await Conversation.findById(conversationId).populate(
      'participants',
      'username avatar publicKey lastSeen'
    );
    if (!conversation) throw new NotFoundError('Conversation not found');

    const isParticipant = conversation.participants.some(
      (p: any) => p._id.toString() === userId
    );
    if (!isParticipant) throw new ForbiddenError('Access denied');

    return conversation;
  }
}

export const conversationsService = new ConversationsService();
