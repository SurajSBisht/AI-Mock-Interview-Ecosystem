import { Schema, model } from 'mongoose';
const userSchema = new Schema({
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
}, {
    timestamps: true,
    versionKey: false,
});
userSchema.set('toJSON', {
    transform: (_doc, ret) => {
        const { passwordHash, verificationOtp, otpExpiresAt, ...safe } = ret;
        void passwordHash;
        void verificationOtp;
        void otpExpiresAt;
        return safe;
    },
});
export const User = model('User', userSchema);
