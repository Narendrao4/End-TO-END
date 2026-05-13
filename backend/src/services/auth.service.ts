import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, RefreshToken, LoginAttempt, EmailVerification, PasswordReset, MfaSecret } from '../models';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
} from '../utils/errors';
import type { RegisterInput, LoginInput } from '../validators/auth.validator';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;
const LOGIN_RATE_WINDOW_MINUTES = 15;
const LOGIN_RATE_MAX_PER_IP = 20;

export class AuthService {
  private getDuplicateFieldFromMongoError(error: unknown): string | null {
    const mongoError = error as {
      code?: number;
      keyPattern?: Record<string, number>;
      keyValue?: Record<string, unknown>;
      message?: string;
    };

    if (mongoError?.code !== 11000) return null;

    if (mongoError.keyPattern) {
      const field = Object.keys(mongoError.keyPattern)[0];
      if (field) return field;
    }

    if (mongoError.keyValue) {
      const field = Object.keys(mongoError.keyValue)[0];
      if (field) return field;
    }

    const msg = mongoError.message || '';
    if (msg.includes('username')) return 'username';
    if (msg.includes('email')) return 'email';

    return null;
  }

  // ─── REGISTER ───────────────────────────────────────────
  async register(input: RegisterInput) {
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim();

    const emailExists = await User.exists({ email });
    if (emailExists) {
      throw new ConflictError('Email is already registered');
    }

    const usernameExists = await User.exists({ username });
    if (usernameExists) {
      throw new ConflictError('Username is already taken');
    }

    let user;
    try {
      const passwordHash = await bcrypt.hash(input.password, 12);
      user = await User.create({
        username,
        email,
        passwordHash,
        publicKey: input.publicKey || '',
        phoneNumber: (input as any).phoneNumber || '',
      });
    } catch (error) {
      const duplicateField = this.getDuplicateFieldFromMongoError(error);
      if (duplicateField === 'email') {
        throw new ConflictError('Email is already registered');
      }
      if (duplicateField === 'username') {
        throw new ConflictError('Username is already taken');
      }
      throw error;
    }

    // Create email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await EmailVerification.create({
      userId: user._id,
      token: verificationToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    });

    const tokens = await this.createTokens(user._id.toString(), user.username);
    return {
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        publicKey: user.publicKey,
        phoneNumber: user.phoneNumber,
        emailVerified: user.emailVerified,
        mfaEnabled: user.mfaEnabled,
        role: user.role,
      },
      ...tokens,
      verificationToken, // Frontend can use this to show verification link
    };
  }

  // ─── LOGIN (with lockout, rate limiting, logging) ───────
  async login(input: LoginInput, ip: string, userAgent: string) {
    // 1. Check IP-level rate limiting
    const recentFromIp = await LoginAttempt.countDocuments({
      ip,
      createdAt: { $gte: new Date(Date.now() - LOGIN_RATE_WINDOW_MINUTES * 60 * 1000) },
    });
    if (recentFromIp >= LOGIN_RATE_MAX_PER_IP) {
      throw new UnauthorizedError('Too many login attempts. Please try again later.');
    }

    // 2. Find user — generic error if not found
    const user = await User.findOne({ email: input.email });
    if (!user) {
      // Log failed attempt event for unknown email
      await LoginAttempt.create({ email: input.email, ip, success: false, userAgent });
      throw new UnauthorizedError('Invalid credentials');
    }

    // 3. Check account lock
    if (user.isLocked) {
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
        throw new ForbiddenError(
          `Account temporarily locked. Try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`
        );
      }
      // Lock expired — unlock
      user.isLocked = false;
      user.lockedUntil = undefined;
      user.failedLoginAttempts = 0;
      await user.save();
    }

    // 4. Validate password
    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      user.failedLoginAttempts += 1;
      await LoginAttempt.create({ email: input.email, ip, success: false, userAgent });

      // Lock after MAX_FAILED_ATTEMPTS
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.isLocked = true;
        user.lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
        await user.save();
        throw new ForbiddenError(
          `Account locked due to too many failed attempts. Try again in ${LOCK_DURATION_MINUTES} minutes.`
        );
      }
      await user.save();
      throw new UnauthorizedError('Invalid credentials');
    }

    // 5. Reset failed attempts on success
    if (user.failedLoginAttempts > 0) {
      user.failedLoginAttempts = 0;
      user.isLocked = false;
      user.lockedUntil = undefined;
      await user.save();
    }

    // 6. Log successful attempt
    await LoginAttempt.create({ email: input.email, ip, success: true, userAgent });

    // 7. Create tokens (rotation: old refresh tokens for this user are kept — they expire on their own)
    const tokens = await this.createTokens(user._id.toString(), user.username);

    return {
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        publicKey: user.publicKey,
        phoneNumber: user.phoneNumber,
        emailVerified: user.emailVerified,
        mfaEnabled: user.mfaEnabled,
        role: user.role,
      },
      ...tokens,
      requiresMfa: user.mfaEnabled,
    };
  }

  // ─── MFA VERIFY (called after login if MFA is enabled) ─
  async verifyMfa(userId: string, code: string) {
    const mfa = await MfaSecret.findOne({ userId, enabled: true });
    if (!mfa) throw new BadRequestError('MFA is not enabled');

    // Check TOTP (time-based: 30-second window)
    const isValid = this.verifyTotp(mfa.secret, code);

    if (!isValid) {
      // Check backup codes
      const backupIndex = mfa.backupCodes.indexOf(code);
      if (backupIndex === -1) {
        throw new UnauthorizedError('Invalid MFA code');
      }
      // Consume the backup code
      mfa.backupCodes.splice(backupIndex, 1);
      await mfa.save();
    }

    return { verified: true };
  }

  // ─── MFA SETUP ──────────────────────────────────────────
  async setupMfa(userId: string) {
    // Generate a 20-byte base32 secret
    const secret = crypto.randomBytes(20).toString('hex');
    const backupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString('hex')
    );

    await MfaSecret.findOneAndUpdate(
      { userId },
      { secret, backupCodes, enabled: false },
      { upsert: true, new: true }
    );

    const user = await User.findById(userId);
    const issuer = 'SecureChat';
    const account = user?.email || userId;
    // otpauth URL for authenticator apps
    const otpauthUrl = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

    return { secret, otpauthUrl, backupCodes };
  }

  async enableMfa(userId: string, code: string) {
    const mfa = await MfaSecret.findOne({ userId });
    if (!mfa) throw new BadRequestError('MFA setup not started');

    const isValid = this.verifyTotp(mfa.secret, code);
    if (!isValid) throw new UnauthorizedError('Invalid MFA code. Please try again.');

    mfa.enabled = true;
    await mfa.save();
    await User.findByIdAndUpdate(userId, { mfaEnabled: true });

    return { enabled: true, backupCodes: mfa.backupCodes };
  }

  async disableMfa(userId: string, password: string) {
    const user = await User.findById(userId);
    if (!user) throw new BadRequestError('User not found');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Invalid password');

    await MfaSecret.deleteOne({ userId });
    user.mfaEnabled = false;
    await user.save();

    return { disabled: true };
  }

  // ─── EMAIL VERIFICATION ─────────────────────────────────
  async verifyEmail(token: string) {
    const verification = await EmailVerification.findOne({ token });
    if (!verification) throw new BadRequestError('Invalid or expired verification link');
    if (verification.expiresAt < new Date()) {
      await EmailVerification.deleteOne({ _id: verification._id });
      throw new BadRequestError('Verification link has expired');
    }

    await User.findByIdAndUpdate(verification.userId, { emailVerified: true });
    await EmailVerification.deleteOne({ _id: verification._id });
    return { verified: true };
  }

  async resendVerification(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new BadRequestError('User not found');
    if (user.emailVerified) throw new BadRequestError('Email already verified');

    // Delete any existing
    await EmailVerification.deleteMany({ userId });

    const token = crypto.randomBytes(32).toString('hex');
    await EmailVerification.create({
      userId,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    return { token, email: user.email };
  }

  // ─── PASSWORD RESET ─────────────────────────────────────
  async requestPasswordReset(email: string) {
    // Always return generic response — never reveal if email exists
    const user = await User.findOne({ email });
    if (user) {
      // Delete old reset tokens
      await PasswordReset.deleteMany({ userId: user._id });

      const token = crypto.randomBytes(32).toString('hex');
      await PasswordReset.create({
        userId: user._id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      });

      // In production: send email with reset link
      // For now, log it (would use a real email service)
      console.log(`[Password Reset] Token for ${email}: ${token}`);
    }

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const reset = await PasswordReset.findOne({ token, used: false });
    if (!reset) throw new BadRequestError('Invalid or expired reset link');
    if (reset.expiresAt < new Date()) {
      await PasswordReset.deleteOne({ _id: reset._id });
      throw new BadRequestError('Reset link has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(reset.userId, {
      passwordHash,
      failedLoginAttempts: 0,
      isLocked: false,
      lockedUntil: undefined,
    });

    // Mark token as used
    reset.used = true;
    await reset.save();

    // Invalidate all refresh tokens for this user
    await RefreshToken.deleteMany({ userId: reset.userId });

    return { message: 'Password reset successfully. Please log in with your new password.' };
  }

  // ─── TOKEN REFRESH (with rotation) ─────────────────────
  async refresh(refreshTokenStr: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshTokenStr);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const stored = await RefreshToken.findOne({ token: refreshTokenStr });
    if (!stored) {
      // Potential token reuse attack — invalidate all tokens for this user
      await RefreshToken.deleteMany({ userId: payload.userId });
      throw new UnauthorizedError('Refresh token not found — all sessions invalidated for security');
    }

    // Delete used token (rotation)
    await RefreshToken.deleteOne({ _id: stored._id });

    const tokens = await this.createTokens(payload.userId, payload.username);
    return tokens;
  }

  async logout(refreshTokenStr: string) {
    await RefreshToken.deleteOne({ token: refreshTokenStr });
  }

  async logoutAll(userId: string) {
    await RefreshToken.deleteMany({ userId });
  }

  async getMe(userId: string) {
    const user = await User.findById(userId).select('-passwordHash');
    if (!user) {
      throw new BadRequestError('User not found');
    }
    return user;
  }

  async updateProfile(userId: string, updates: { publicKey?: string; avatar?: string; bio?: string; phoneNumber?: string }) {
    const allowed: Record<string, string> = {};
    if (updates.publicKey !== undefined) allowed.publicKey = updates.publicKey;
    if (updates.avatar !== undefined) allowed.avatar = updates.avatar;
    if (updates.bio !== undefined) allowed.bio = updates.bio;
    if (updates.phoneNumber !== undefined) allowed.phoneNumber = updates.phoneNumber;

    const user = await User.findByIdAndUpdate(userId, { $set: allowed }, { new: true }).select('-passwordHash');
    if (!user) {
      throw new BadRequestError('User not found');
    }
    return user;
  }

  // ─── SECURITY: Login history ────────────────────────────
  async getLoginHistory(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new BadRequestError('User not found');
    return LoginAttempt.find({ email: user.email })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('ip success userAgent createdAt');
  }

  // ─── HELPERS ────────────────────────────────────────────
  private async createTokens(userId: string, username: string) {
    const accessToken = generateAccessToken({ userId, username });
    const refreshToken = generateRefreshToken({ userId, username });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await RefreshToken.create({
      userId,
      token: refreshToken,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }

  /** Simple TOTP verification (HMAC-based, 30-second window, ±1 step tolerance) */
  private verifyTotp(secret: string, code: string): boolean {
    const now = Math.floor(Date.now() / 1000);
    const period = 30;
    // Check current period and ±1 for clock drift
    for (let i = -1; i <= 1; i++) {
      const counter = Math.floor(now / period) + i;
      const expected = this.generateTotp(secret, counter);
      if (expected === code) return true;
    }
    return false;
  }

  private generateTotp(secret: string, counter: number): string {
    const buf = Buffer.alloc(8);
    buf.writeUInt32BE(0, 0);
    buf.writeUInt32BE(counter, 4);
    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'hex'));
    hmac.update(buf);
    const digest = hmac.digest();
    const offset = digest[digest.length - 1] & 0x0f;
    const binary =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);
    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  }
}

export const authService = new AuthService();
