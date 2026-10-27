import { model, models, Schema, type Model } from 'mongoose';

type UserDoc = { email: string; displayName?: string; passwordHash: string; createdAt: string };
type RefreshTokenDoc = {
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
  revokedAt?: Date;
};

const userSchema = new Schema<UserDoc>(
  {
    email: { type: String, required: true, unique: true },
    displayName: String,
    passwordHash: { type: String, required: true },
    createdAt: { type: String, required: true },
  },
  { collection: 'users', versionKey: false },
);

const refreshTokenSchema = new Schema<RefreshTokenDoc>(
  {
    userId: { type: String, required: true },
    familyId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    // TTL index: MongoDB removes expired tokens automatically.
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    usedAt: Date,
    revokedAt: Date,
  },
  { collection: 'refresh_tokens', versionKey: false },
);

export const UserModel: Model<UserDoc> = (models['User'] as Model<UserDoc> | undefined) ?? model<UserDoc>('User', userSchema);
export const RefreshTokenModel: Model<RefreshTokenDoc> =
  (models['RefreshToken'] as Model<RefreshTokenDoc> | undefined) ?? model<RefreshTokenDoc>('RefreshToken', refreshTokenSchema);
