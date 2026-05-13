import { FriendRequest, Friendship, User } from '../models';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../utils/errors';

export class FriendsService {
  async sendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) {
      throw new BadRequestError('Cannot send friend request to yourself');
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      throw new NotFoundError('User not found');
    }

    // Check existing friendship
    const existingFriendship = await Friendship.findOne({
      users: { $all: [senderId, receiverId] },
    });
    if (existingFriendship) {
      throw new ConflictError('Already friends');
    }

    // Check existing request in either direction
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { senderId, receiverId, status: 'pending' },
        { senderId: receiverId, receiverId: senderId, status: 'pending' },
      ],
    });
    if (existingRequest) {
      throw new ConflictError('Friend request already exists');
    }

    const request = await FriendRequest.create({ senderId, receiverId });
    return request.populate([
      { path: 'senderId', select: 'username avatar' },
      { path: 'receiverId', select: 'username avatar' },
    ]);
  }

  async acceptRequest(requestId: string, userId: string) {
    const request = await FriendRequest.findById(requestId);
    if (!request) throw new NotFoundError('Friend request not found');
    if (request.receiverId.toString() !== userId) {
      throw new ForbiddenError('Not authorized');
    }
    if (request.status !== 'pending') {
      throw new BadRequestError('Request is no longer pending');
    }

    request.status = 'accepted';
    await request.save();

    await Friendship.create({
      users: [request.senderId, request.receiverId],
    });

    return request;
  }

  async rejectRequest(requestId: string, userId: string) {
    const request = await FriendRequest.findById(requestId);
    if (!request) throw new NotFoundError('Friend request not found');
    if (request.receiverId.toString() !== userId) {
      throw new ForbiddenError('Not authorized');
    }
    if (request.status !== 'pending') {
      throw new BadRequestError('Request is no longer pending');
    }

    request.status = 'rejected';
    await request.save();
    return request;
  }

  async cancelRequest(requestId: string, userId: string) {
    const request = await FriendRequest.findById(requestId);
    if (!request) throw new NotFoundError('Friend request not found');
    if (request.senderId.toString() !== userId) {
      throw new ForbiddenError('Not authorized');
    }
    if (request.status !== 'pending') {
      throw new BadRequestError('Request is no longer pending');
    }

    request.status = 'cancelled';
    await request.save();
    return request;
  }

  async getIncomingRequests(userId: string) {
    return FriendRequest.find({ receiverId: userId, status: 'pending' })
      .populate('senderId', 'username avatar email')
      .sort({ createdAt: -1 });
  }

  async getOutgoingRequests(userId: string) {
    return FriendRequest.find({ senderId: userId, status: 'pending' })
      .populate('receiverId', 'username avatar email')
      .sort({ createdAt: -1 });
  }

  async getFriendsList(userId: string) {
    const friendships = await Friendship.find({ users: userId })
      .populate('users', 'username avatar email publicKey lastSeen bio')
      .sort({ createdAt: -1 });

    return friendships.map((f) => {
      const friend = f.users.find(
        (u: any) => u._id.toString() !== userId
      );
      return { friendshipId: f._id, friend, createdAt: f.createdAt };
    });
  }

  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const friendship = await Friendship.findOne({
      users: { $all: [userId1, userId2] },
    });
    return !!friendship;
  }
}

export const friendsService = new FriendsService();
