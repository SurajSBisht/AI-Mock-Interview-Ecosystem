import 'dotenv/config';
import nodemailer from 'nodemailer';
function requireEmailConfig() {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const from = process.env.EMAIL_FROM || user;
    if (!user || !pass || !from) {
        throw new Error('EMAIL_USER, EMAIL_PASS, and EMAIL_FROM must be configured');
    }
    return { user, pass, from };
}
let cachedTransporter = null;
export function getEmailTransporter() {
    if (!cachedTransporter) {
        const { user, pass } = requireEmailConfig();
        cachedTransporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user,
                pass,
            },
        });
    }
    return cachedTransporter;
}
export function getEmailFrom() {
    return requireEmailConfig().from;
}
