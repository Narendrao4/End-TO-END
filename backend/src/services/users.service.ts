import { User } from '../models';

export class UsersService {
  async search(query: string, currentUserId: string) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    // Check if query looks like a phone number (digits, spaces, +, -)
    const isPhoneQuery = /^[\d\s+\-()]+$/.test(query.trim());
    const phoneDigits = query.replace(/\D/g, '');

    const orConditions: any[] = [{ username: regex }, { email: regex }];
    if (isPhoneQuery && phoneDigits.length >= 4) {
      orConditions.push({
        phoneNumber: { $regex: phoneDigits, $options: 'i' },
      });
    }

    const users = await User.find({
      $and: [{ _id: { $ne: currentUserId } }, { $or: orConditions }],
    })
      .select('username email avatar bio publicKey phoneNumber')
      .limit(20);
    return users;
  }

  async getProfile(userId: string) {
    const user = await User.findById(userId).select(
      'username email avatar bio publicKey lastSeen createdAt'
    );
    return user;
  }
}

export const usersService = new UsersService();
