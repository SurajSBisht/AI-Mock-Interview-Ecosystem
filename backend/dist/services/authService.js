import { createHash, randomInt } from 'crypto';
import { User } from '../models/User.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { signAccessToken } from '../utils/jwt.js';
import { getEmailFrom, getEmailTransporter } from '../config/email.js';
import { HttpError } from '../utils/httpError.js';
const OTP_TTL_MINUTES = 10;
function normalizeEmail(email) {
    return email.trim().toLowerCase();
}
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function validatePasswordStrength(password) {
    return (password.length >= 8 &&
        /[a-z]/.test(password) &&
        /[A-Z]/.test(password) &&
        /\d/.test(password) &&
        /[^A-Za-z0-9]/.test(password));
}
function createOtp() {
    return randomInt(100000, 1000000).toString();
}
function hashOtp(otp) {
    // Store only a hash of the OTP so the raw code is never persisted in MongoDB.
    const pepper = process.env.OTP_PEPPER || process.env.JWT_SECRET || 'otp-pepper';
    return createHash('sha256').update(`${otp}:${pepper}`).digest('hex');
}
function toAuthUserResponse(user) {
    const createdAt = user.createdAt ?? new Date();
    const updatedAt = user.updatedAt ?? createdAt;
    return {
        id: String(user._id),
        fullName: user.fullName,
        email: user.email,
        role: 'candidate',
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
        isVerified: user.isVerified,
    };
}
async function sendOtpEmail(fullName, email, otp) {
    const from = getEmailFrom();
    await getEmailTransporter().sendMail({
        from,
        to: email,
        subject: 'Verify your AMIE account',
        text: [
            `Hi ${fullName},`,
            '',
            `Your AMIE verification code is ${otp}.`,
            `This code expires in ${OTP_TTL_MINUTES} minutes.`,
            '',
            'If you did not request this account, you can ignore this email.',
        ].join('\n'),
        html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2 style="margin:0 0 12px">Verify your AMIE account</h2>
        <p>Hi ${fullName},</p>
        <p>Your verification code is <strong style="font-size:24px;letter-spacing:4px">${otp}</strong></p>
        <p>This code expires in ${OTP_TTL_MINUTES} minutes.</p>
        <p>If you did not request this account, you can ignore this email.</p>
      </div>
    `,
    });
}
export async function registerUser(input) {
    const fullName = input.fullName.trim();
    const email = normalizeEmail(input.email);
    const password = input.password;
    if (!fullName || fullName.length < 2) {
        throw new HttpError(400, 'Full name must be at least 2 characters long');
    }
    if (!isValidEmail(email)) {
        throw new HttpError(400, 'Please enter a valid email address');
    }
    if (!validatePasswordStrength(password)) {
        throw new HttpError(400, 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character');
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new HttpError(409, 'An account with this email already exists');
    }
    const passwordHash = await hashPassword(password);
    const otp = createOtp();
    const verificationOtp = hashOtp(otp);
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    const user = await User.create({
        fullName,
        email,
        passwordHash,
        isVerified: false,
        verificationOtp,
        otpExpiresAt,
    });
    await sendOtpEmail(user.fullName, user.email, otp);
    return {
        user: toAuthUserResponse(user),
        message: 'Registration successful. Please verify your email with the OTP we sent.',
    };
}
export async function verifyOtp(input) {
    const email = normalizeEmail(input.email);
    const otp = input.otp.trim();
    if (!isValidEmail(email)) {
        throw new HttpError(400, 'Please enter a valid email address');
    }
    if (!/^\d{6}$/.test(otp)) {
        throw new HttpError(400, 'OTP must be a 6-digit code');
    }
    // OTP fields are excluded by default, so we explicitly opt in for verification checks.
    const user = await User.findOne({ email }).select('+verificationOtp +otpExpiresAt');
    if (!user) {
        throw new HttpError(404, 'Account not found');
    }
    if (user.isVerified) {
        return {
            user: toAuthUserResponse(user),
            message: 'Account is already verified',
        };
    }
    if (!user.verificationOtp || !user.otpExpiresAt) {
        throw new HttpError(400, 'OTP is no longer available. Please request a new code.');
    }
    if (user.otpExpiresAt.getTime() < Date.now()) {
        throw new HttpError(400, 'OTP has expired. Please request a new code.');
    }
    const expectedOtp = user.verificationOtp;
    const actualOtp = hashOtp(otp);
    if (expectedOtp !== actualOtp) {
        throw new HttpError(400, 'Invalid OTP. Please try again.');
    }
    user.isVerified = true;
    user.verificationOtp = null;
    user.otpExpiresAt = null;
    await user.save();
    return {
        user: toAuthUserResponse(user),
        message: 'Email verified successfully',
    };
}
export async function resendOtp(input) {
    const email = normalizeEmail(input.email);
    if (!isValidEmail(email)) {
        throw new HttpError(400, 'Please enter a valid email address');
    }
    // OTP fields are excluded by default, so we explicitly opt in for resend handling.
    const user = await User.findOne({ email }).select('+verificationOtp +otpExpiresAt');
    if (!user) {
        throw new HttpError(404, 'Account not found');
    }
    if (user.isVerified) {
        throw new HttpError(400, 'This account is already verified');
    }
    const otp = createOtp();
    user.verificationOtp = hashOtp(otp);
    user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    await user.save();
    await sendOtpEmail(user.fullName, user.email, otp);
    return {
        message: 'A new verification code has been sent',
    };
}
export async function loginUser(input) {
    const email = normalizeEmail(input.email);
    const password = input.password;
    if (!isValidEmail(email)) {
        throw new HttpError(400, 'Please enter a valid email address');
    }
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
        throw new HttpError(401, 'Invalid email or password');
    }
    if (!user.isVerified) {
        throw new HttpError(403, 'Please verify your email before logging in');
    }
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
        throw new HttpError(401, 'Invalid email or password');
    }
    const token = signAccessToken({
        userId: String(user._id),
        email: user.email,
    });
    return {
        token,
        user: toAuthUserResponse(user),
        message: 'Login successful',
    };
}
export async function getCurrentUser(userId) {
    const user = await User.findById(userId);
    if (!user) {
        throw new HttpError(404, 'User not found');
    }
    return {
        user: toAuthUserResponse(user),
    };
}
