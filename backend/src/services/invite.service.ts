import crypto from 'crypto';
import { InviteLink, IInviteLink } from '../models/InviteLink';
import { User, Friendship, FriendRequest } from '../models';
import { BadRequestError, NotFoundError, ConflictError } from '../utils/errors';

export class InviteService {
  async createInviteLink(
    creatorId: string,
    options?: { expiresInHours?: number; maxUses?: number }
  ) {
    const code = crypto.randomBytes(8).toString('hex');
    const expiresInHours = options?.expiresInHours || 72; // default 3 days
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const link = await InviteLink.create({
      creatorId,
      code,
      expiresAt,
      maxUses: options?.maxUses || 0,
    });

    return link;
  }

  async getMyInviteLinks(creatorId: string) {
    return InviteLink.find({ creatorId, isActive: true })
      .sort({ createdAt: -1 })
      .limit(20);
  }

  async getInviteLinkInfo(code: string) {
    const link = await InviteLink.findOne({ code }).populate(
      'creatorId',
      'username avatar bio'
    );

    if (!link) throw new NotFoundError('Invite link not found');
    if (!link.isActive) throw new BadRequestError('This invite link is no longer active');
    if (link.expiresAt < new Date()) throw new BadRequestError('This invite link has expired');
    if (link.maxUses > 0 && link.uses >= link.maxUses) {
      throw new BadRequestError('This invite link has reached its maximum uses');
    }

    return link;
  }

  async acceptInviteLink(code: string, userId: string) {
    const link = await InviteLink.findOne({ code });

    if (!link) throw new NotFoundError('Invite link not found');
    if (!link.isActive) throw new BadRequestError('This invite link is no longer active');
    if (link.expiresAt < new Date()) throw new BadRequestError('This invite link has expired');
    if (link.maxUses > 0 && link.uses >= link.maxUses) {
      throw new BadRequestError('This invite link has reached its maximum uses');
    }

    const creatorId = link.creatorId.toString();
    if (creatorId === userId) {
      throw new BadRequestError('You cannot accept your own invite link');
    }

    // Check if already used by this user
    if (link.usedBy.some((id) => id.toString() === userId)) {
      throw new ConflictError('You have already used this invite link');
    }

    // Check if already friends
    const existingFriendship = await Friendship.findOne({
      users: { $all: [userId, creatorId] },
    });
    if (existingFriendship) {
      throw new ConflictError('You are already friends with this user');
    }

    // Check if there's a pending friend request in either direction
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { senderId: userId, receiverId: creatorId, status: 'pending' },
        { senderId: creatorId, receiverId: userId, status: 'pending' },
      ],
    });
    if (existingRequest) {
      throw new ConflictError('A friend request already exists between you two');
    }

    // Auto-create friendship (invite link = mutual acceptance)
    await Friendship.create({ users: [userId, creatorId] });

    // Record usage
    link.uses += 1;
    link.usedBy.push(userId as any);
    await link.save();

    const creator = await User.findById(creatorId).select(
      'username avatar bio'
    );
    return { message: 'You are now friends!', friend: creator };
  }

  async deactivateLink(linkId: string, creatorId: string) {
    const link = await InviteLink.findById(linkId);
    if (!link) throw new NotFoundError('Invite link not found');
    if (link.creatorId.toString() !== creatorId) {
      throw new BadRequestError('You can only deactivate your own links');
    }
    link.isActive = false;
    await link.save();
    return link;
  }
}

export const inviteService = new InviteService();
