import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  email: string;
  passwordHash: string;
  avatar?: string;
  bio?: string;
  publicKey?: string;
  phoneNumber?: string;
  emailVerified: boolean;
  isLocked: boolean;
  lockedUntil?: Date;
  failedLoginAttempts: number;
  role: 'user' | 'admin';
  mfaEnabled: boolean;
  expoPushToken?: string;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: { type: String, required: true },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 200 },
    publicKey: { type: String, default: '' },
    phoneNumber: { type: String, default: '', trim: true },
    emailVerified: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
    lockedUntil: { type: Date },
    failedLoginAttempts: { type: Number, default: 0 },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    mfaEnabled: { type: Boolean, default: false },
    expoPushToken: { type: String, default: '' },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// unique: true on the field already creates the index — no extra .index() needed

export const User = mongoose.model<IUser>('User', UserSchema);
