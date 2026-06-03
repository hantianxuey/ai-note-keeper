import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler, publicUser, requireFields, requireUserId } from './controllerUtils';

const JWT_SECRET = process.env.JWT_SECRET!;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signUserToken = (userId: number) => jwt.sign({ userId }, JWT_SECRET, {
  expiresIn: '7d',
});

const validateCredentials = (email: string, password: string) => {
  if (!emailRegex.test(email)) {
    throw new AppError('Invalid email format', 400);
  }

  if (password.length < 6) {
    throw new AppError('Password must be at least 6 characters', 400);
  }
};

export const register = asyncHandler(async (req: AuthRequest, res) => {
  const { email, password } = req.body;
  requireFields(req.body, ['email', 'password'], 'Email and password are required');
  validateCredentials(email, password);

  const existingUser = await UserModel.findByEmail(email);
  if (existingUser) {
    throw new AppError('User with this email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await UserModel.create(email, passwordHash);

  res.status(201).json({
    token: signUserToken(user.id),
    user: publicUser(user),
  });
});

export const login = asyncHandler(async (req: AuthRequest, res) => {
  const { email, password } = req.body;
  requireFields(req.body, ['email', 'password'], 'Email and password are required');

  const user = await UserModel.findByEmail(email);
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    throw new AppError('Invalid email or password', 401);
  }

  res.json({
    token: signUserToken(user.id),
    user: publicUser(user),
  });
});

export const me = asyncHandler(async (req: AuthRequest, res) => {
  const user = await UserModel.findById(requireUserId(req));

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({ user: publicUser(user) });
});
