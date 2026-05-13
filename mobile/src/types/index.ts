export interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  publicKey?: string;
  phoneNumber?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface FriendEntry {
  friendshipId: string;
  friend: User;
  createdAt: string;
}

export interface FriendRequest {
  _id: string;
  senderId: User | string;
  receiverId: User | string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  _id: string;
  participants: User[];
  lastMessageAt: string;
  createdAt: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  senderPublicKey?: string;
  encryptedPayload: string;
  nonce: string;
  messageType: 'text';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: string;
  updatedAt: string;
  text?: string;
}

export interface InviteLink {
  _id: string;
  creatorId: string | User;
  code: string;
  expiresAt: string;
  maxUses: number;
  uses: number;
  usedBy: string[];
  isActive: boolean;
  createdAt: string;
}
