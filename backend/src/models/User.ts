import { Schema, model, type HydratedDocument } from 'mongoose'

export interface UserRecord {
  fullName: string
  email: string
  passwordHash: string
  isVerified: boolean
  verificationOtp?: string | null
  otpExpiresAt?: Date | null
}

export type UserDocument = HydratedDocument<UserRecord>

const userSchema = new Schema<UserRecord>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationOtp: {
      type: String,
      default: null,
      select: false,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const { passwordHash, verificationOtp, otpExpiresAt, ...safe } = ret
    void passwordHash
    void verificationOtp
    void otpExpiresAt
    return safe
  },
})

export const User = model<UserRecord>('User', userSchema)
