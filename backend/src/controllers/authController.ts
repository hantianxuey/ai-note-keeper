import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler, publicUser, requireFields, requireUserId } from './controllerUtils';
import { readSensitiveField } from '../config/requestEncryption';
import { emailVerificationService } from '../services/emailVerificationService';
import { recordAuditEvent } from '../services/auditService';

const JWT_SECRET = process.env.JWT_SECRET!;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signUserToken = (userId: number) => jwt.sign({ userId }, JWT_SECRET, {
  expiresIn: '7d',
});

const setAuthCookie = (res: any, token: string) => {
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
};

const validateCredentials = (email: string, password: string) => {
  if (!emailRegex.test(email)) {
    throw new AppError('Invalid email format', 400);
  }

  if (password.length < 6) {
    throw new AppError('Password must be at least 6 characters', 400);
  }
};

export const register = asyncHandler(async (req: AuthRequest, res) => {
  const { email, verificationCode } = req.body;
  const password = readSensitiveField(req.body, 'password');
  requireFields({ email, password }, ['email', 'password'], 'Email and password are required');
  requireFields(req.body, ['verificationCode'], 'Verification code is required');
  if (!password) {
    throw new AppError('Password is required', 400);
  }
  validateCredentials(email, password);

  const existingUser = await UserModel.findByEmail(email);
  if (existingUser) {
    throw new AppError('User with this email already exists', 409);
  }

  try {
    await emailVerificationService.verify(email, verificationCode);
  } catch (error: any) {
    throw new AppError(error.message || 'Invalid verification code', 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await UserModel.create(email, passwordHash);

  const token = signUserToken(user.id);
  setAuthCookie(res, token);
  recordAuditEvent({ event: 'auth.register', outcome: 'success', userId: user.id, subject: email });

  res.status(201).json({
    token,
    user: publicUser(user),
  });
});

export const login = asyncHandler(async (req: AuthRequest, res) => {
  const { email } = req.body;
  const password = readSensitiveField(req.body, 'password');
  requireFields({ email, password }, ['email', 'password'], 'Email and password are required');
  if (!password) {
    throw new AppError('Password is required', 400);
  }

  const user = await UserModel.findByEmail(email);
  if (!user) {
    recordAuditEvent({ event: 'auth.login', outcome: 'failure', subject: email });
    throw new AppError('Invalid email or password', 401);
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    recordAuditEvent({ event: 'auth.login', outcome: 'failure', userId: user.id, subject: email });
    throw new AppError('Invalid email or password', 401);
  }

  const token = signUserToken(user.id);
  setAuthCookie(res, token);
  recordAuditEvent({ event: 'auth.login', outcome: 'success', userId: user.id, subject: email });

  res.json({
    token,
    user: publicUser(user),
  });
});

export const logout = asyncHandler(async (req: AuthRequest, res) => {
  recordAuditEvent({ event: 'auth.logout', outcome: 'success', userId: req.userId });
  res.clearCookie('auth_token', { path: '/' });
  res.status(204).end();
});

export const sendVerificationCode = asyncHandler(async (req: AuthRequest, res) => {
  const { email } = req.body;
  requireFields(req.body, ['email'], 'Email is required');

  if (!emailRegex.test(email)) {
    throw new AppError('Invalid email format', 400);
  }

  const existingUser = await UserModel.findByEmail(email);
  if (existingUser) {
    throw new AppError('User with this email already exists', 409);
  }

  const result = await emailVerificationService.createAndSend(email);
  recordAuditEvent({ event: 'auth.verification_code', outcome: 'success', subject: email });
  res.json({
    message: 'Verification code sent',
    ...result,
  });
});

export const sendPasswordResetCode = asyncHandler(async (req: AuthRequest, res) => {
  const { email } = req.body;
  requireFields(req.body, ['email'], 'Email is required');

  if (!emailRegex.test(email)) {
    throw new AppError('Invalid email format', 400);
  }

  const existingUser = await UserModel.findByEmail(email);
  if (!existingUser) {
    throw new AppError('User not found', 404);
  }

  const result = await emailVerificationService.createAndSend(email);
  recordAuditEvent({ event: 'auth.password_reset_code', outcome: 'success', userId: existingUser.id, subject: email });
  res.json({
    message: 'Password reset code sent',
    ...result,
  });
});

export const resetPassword = asyncHandler(async (req: AuthRequest, res) => {
  const { email, verificationCode } = req.body;
  const password = readSensitiveField(req.body, 'password');
  requireFields({ email, password }, ['email', 'password'], 'Email and password are required');
  requireFields(req.body, ['verificationCode'], 'Verification code is required');
  if (!password) {
    throw new AppError('Password is required', 400);
  }
  validateCredentials(email, password);

  const existingUser = await UserModel.findByEmail(email);
  if (!existingUser) {
    throw new AppError('User not found', 404);
  }

  try {
    await emailVerificationService.verify(email, verificationCode);
  } catch (error: any) {
    throw new AppError(error.message || 'Invalid verification code', 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await UserModel.updatePassword(existingUser.id, passwordHash);

  const token = signUserToken(existingUser.id);
  setAuthCookie(res, token);
  recordAuditEvent({ event: 'auth.password_reset', outcome: 'success', userId: existingUser.id, subject: email });

  res.json({
    token,
    user: publicUser(existingUser),
  });
});

export const me = asyncHandler(async (req: AuthRequest, res) => {
  const user = await UserModel.findById(requireUserId(req));

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({ user: publicUser(user) });
});
