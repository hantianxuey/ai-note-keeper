import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { EmailVerificationModel } from '../models/EmailVerification';

const CODE_TTL_MINUTES = 10;

const secret = () =>
  process.env.EMAIL_VERIFICATION_SECRET || process.env.JWT_SECRET || 'development-email-verification-secret';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const createCode = () => crypto.randomInt(100000, 1000000).toString();

const smtpUrl = () => process.env.SMTP_URL?.trim();

const smtpHost = () => process.env.SMTP_HOST?.trim();

export const createVerificationCodeHash = (email: string, code: string) =>
  crypto
    .createHmac('sha256', secret())
    .update(`${normalizeEmail(email)}:${code}`)
    .digest('hex');

export const verifyCodeHash = (expectedHash: string, email: string, code: string) => {
  const actualHash = createVerificationCodeHash(email, code);
  return crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(actualHash));
};

const sendEmail = async (email: string, code: string) => {
  if (!smtpUrl() && !smtpHost()) {
    if (process.env.NODE_ENV === 'production' && process.env.EMAIL_VERIFICATION_EXPOSE_DEV_CODE !== 'true') {
      throw new Error('SMTP_URL or SMTP_HOST is required to send verification emails in production');
    }
    return;
  }

  const transporter = smtpUrl()
    ? nodemailer.createTransport(smtpUrl()!)
    : nodemailer.createTransport({
        host: smtpHost(),
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
      });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'AI Note Keeper verification code',
    text: `Your AI Note Keeper verification code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes.`,
  });
};

export const emailVerificationService = {
  async createAndSend(email: string): Promise<{ devCode?: string }> {
    const normalizedEmail = normalizeEmail(email);
    const code = createCode();
    const codeHash = createVerificationCodeHash(normalizedEmail, code);
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

    await EmailVerificationModel.create(normalizedEmail, codeHash, expiresAt);
    await sendEmail(normalizedEmail, code);

    return process.env.NODE_ENV === 'production' && process.env.EMAIL_VERIFICATION_EXPOSE_DEV_CODE !== 'true'
      ? {}
      : { devCode: code };
  },

  async verify(email: string, code: string): Promise<void> {
    const normalizedEmail = normalizeEmail(email);
    const record = await EmailVerificationModel.findLatestValid(normalizedEmail);

    if (!record) {
      throw new Error('Invalid or expired verification code');
    }

    if (!verifyCodeHash(record.code_hash, normalizedEmail, code)) {
      await EmailVerificationModel.incrementAttempts(record.id);
      throw new Error('Invalid verification code');
    }

    await EmailVerificationModel.markConsumed(record.id);
  },
};
