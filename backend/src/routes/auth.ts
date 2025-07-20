import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { getDatabase } from '../database/init';
import { promisify } from 'util';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authRateLimiterMiddleware } from '../middleware/rateLimiter';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  displayName: Joi.string().min(2).max(50).optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Register new user
router.post('/register', authRateLimiterMiddleware, asyncHandler(async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const { email, password, displayName } = value;
  const db = getDatabase();
  const get = promisify(db.get.bind(db));
  const run = promisify(db.run.bind(db));

  // Check if user already exists
  const existingUser = await get('SELECT id FROM users WHERE email = ?', [email]);
  if (existingUser) {
    throw createError('User already exists with this email', 409);
  }

  // Hash password
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create user
  const userId = uuidv4();
  await run(
    `INSERT INTO users (id, email, password_hash, display_name, plan, credits) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, email, passwordHash, displayName || email.split('@')[0], 'free', 10]
  );

  // Create session
  const sessionId = uuidv4();
  const token = jwt.sign(
    { userId, sessionId },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await run(
    `INSERT INTO user_sessions (id, user_id, token_hash, expires_at, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [sessionId, userId, sessionId, expiresAt.toISOString(), req.ip, req.get('User-Agent')]
  );

  res.status(201).json({
    message: 'User registered successfully',
    user: {
      id: userId,
      email,
      displayName: displayName || email.split('@')[0],
      plan: 'free',
      credits: 10
    },
    token
  });
}));

// Login user
router.post('/login', authRateLimiterMiddleware, asyncHandler(async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const { email, password } = value;
  const db = getDatabase();
  const get = promisify(db.get.bind(db));
  const run = promisify(db.run.bind(db));

  // Find user
  const user = await get(
    'SELECT id, email, password_hash, display_name, plan, credits FROM users WHERE email = ? AND is_active = 1',
    [email]
  );

  if (!user) {
    throw createError('Invalid email or password', 401);
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    throw createError('Invalid email or password', 401);
  }

  // Create session
  const sessionId = uuidv4();
  const token = jwt.sign(
    { userId: user.id, sessionId },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await run(
    `INSERT INTO user_sessions (id, user_id, token_hash, expires_at, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [sessionId, user.id, sessionId, expiresAt.toISOString(), req.ip, req.get('User-Agent')]
  );

  // Update last login
  await run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

  res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      plan: user.plan,
      credits: user.credits
    },
    token
  });
}));

// Get current user
router.get('/me', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const db = getDatabase();
  const get = promisify(db.get.bind(db));

  const user = await get(
    `SELECT id, email, display_name, avatar_url, plan, credits, created_at, last_login 
     FROM users WHERE id = ?`,
    [req.user!.id]
  );

  if (!user) {
    throw createError('User not found', 404);
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      plan: user.plan,
      credits: user.credits,
      createdAt: user.created_at,
      lastLogin: user.last_login
    }
  });
}));

// Logout user
router.post('/logout', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    const decoded = jwt.decode(token) as any;
    if (decoded && decoded.sessionId) {
      const db = getDatabase();
      const run = promisify(db.run.bind(db));
      
      // Remove session
      await run('DELETE FROM user_sessions WHERE id = ?', [decoded.sessionId]);
    }
  }

  res.json({ message: 'Logout successful' });
}));

// Refresh token
router.post('/refresh', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const sessionId = uuidv4();
  const token = jwt.sign(
    { userId: req.user!.id, sessionId },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  const db = getDatabase();
  const run = promisify(db.run.bind(db));
  
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await run(
    `INSERT INTO user_sessions (id, user_id, token_hash, expires_at, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [sessionId, req.user!.id, sessionId, expiresAt.toISOString(), req.ip, req.get('User-Agent')]
  );

  res.json({
    message: 'Token refreshed successfully',
    token
  });
}));

export default router;