import express from 'express';
import bcrypt from 'bcryptjs';
import Joi from 'joi';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/init';
import { promisify } from 'util';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Validation schemas
const updateProfileSchema = Joi.object({
  displayName: Joi.string().min(2).max(50).optional(),
  email: Joi.string().email().optional()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required()
});

// Get user profile
router.get('/profile', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const db = getDatabase();
  const get = promisify(db.get.bind(db));

  const user = await get(
    `SELECT id, email, display_name, avatar_url, plan, credits, created_at, last_login,
            (SELECT COUNT(*) FROM projects WHERE user_id = users.id) as project_count,
            (SELECT COUNT(*) FROM ai_generations WHERE user_id = users.id) as generation_count
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
      lastLogin: user.last_login,
      stats: {
        projectCount: user.project_count,
        generationCount: user.generation_count
      }
    }
  });
}));

// Update user profile
router.put('/profile', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { error, value } = updateProfileSchema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const db = getDatabase();
  const get = promisify(db.get.bind(db));
  const run = promisify(db.run.bind(db));

  // Check if email is already taken (if updating email)
  if (value.email) {
    const existingUser = await get(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [value.email, req.user!.id]
    );

    if (existingUser) {
      throw createError('Email already in use', 409);
    }
  }

  // Build update query dynamically
  const updates: string[] = [];
  const params: any[] = [];

  Object.entries(value).forEach(([key, val]) => {
    if (val !== undefined) {
      const dbKey = key === 'displayName' ? 'display_name' : key;
      updates.push(`${dbKey} = ?`);
      params.push(val);
    }
  });

  if (updates.length === 0) {
    throw createError('No valid fields to update', 400);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.user!.id);

  await run(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  res.json({ message: 'Profile updated successfully' });
}));

// Upload avatar
router.post('/avatar', authenticateToken, upload.single('avatar'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.file) {
    throw createError('No file uploaded', 400);
  }

  const db = getDatabase();
  const run = promisify(db.run.bind(db));

  const avatarUrl = `/uploads/avatars/${req.file.filename}`;

  await run(
    'UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [avatarUrl, req.user!.id]
  );

  res.json({
    message: 'Avatar uploaded successfully',
    avatarUrl
  });
}));

// Change password
router.put('/password', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { error, value } = changePasswordSchema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const { currentPassword, newPassword } = value;
  const db = getDatabase();
  const get = promisify(db.get.bind(db));
  const run = promisify(db.run.bind(db));

  // Get current password hash
  const user = await get(
    'SELECT password_hash FROM users WHERE id = ?',
    [req.user!.id]
  );

  if (!user) {
    throw createError('User not found', 404);
  }

  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValidPassword) {
    throw createError('Current password is incorrect', 400);
  }

  // Hash new password
  const saltRounds = 12;
  const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

  // Update password
  await run(
    'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [newPasswordHash, req.user!.id]
  );

  res.json({ message: 'Password changed successfully' });
}));

// Get user usage statistics
router.get('/usage', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const db = getDatabase();
  const all = promisify(db.all.bind(db));

  // Get usage stats for the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    generationStats,
    projectStats,
    creditUsage,
    apiUsage
  ] = await Promise.all([
    // AI generation stats
    all(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        SUM(tokens_used) as tokens,
        SUM(cost) as cost
      FROM ai_generations 
      WHERE user_id = ? AND created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [req.user!.id, thirtyDaysAgo]),

    // Project stats
    all(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM projects 
      WHERE user_id = ? AND created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [req.user!.id, thirtyDaysAgo]),

    // Credit usage over time
    all(`
      SELECT 
        DATE(created_at) as date,
        SUM(credits_added) as credits_added
      FROM payment_transactions 
      WHERE user_id = ? AND created_at >= ? AND status = 'completed'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [req.user!.id, thirtyDaysAgo]),

    // API usage stats
    all(`
      SELECT 
        endpoint,
        COUNT(*) as count,
        AVG(response_time) as avg_response_time
      FROM api_usage 
      WHERE user_id = ? AND created_at >= ?
      GROUP BY endpoint
      ORDER BY count DESC
    `, [req.user!.id, thirtyDaysAgo])
  ]);

  res.json({
    usage: {
      generations: generationStats,
      projects: projectStats,
      credits: creditUsage,
      api: apiUsage
    },
    period: {
      start: thirtyDaysAgo,
      end: new Date().toISOString()
    }
  });
}));

// Delete user account
router.delete('/account', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { password } = req.body;

  if (!password) {
    throw createError('Password required to delete account', 400);
  }

  const db = getDatabase();
  const get = promisify(db.get.bind(db));
  const run = promisify(db.run.bind(db));

  // Verify password
  const user = await get(
    'SELECT password_hash FROM users WHERE id = ?',
    [req.user!.id]
  );

  if (!user) {
    throw createError('User not found', 404);
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    throw createError('Invalid password', 400);
  }

  // Delete user account (cascade will handle related records)
  await run('DELETE FROM users WHERE id = ?', [req.user!.id]);

  res.json({ message: 'Account deleted successfully' });
}));

// Get user sessions
router.get('/sessions', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const db = getDatabase();
  const all = promisify(db.all.bind(db));

  const sessions = await all(
    `SELECT id, created_at, last_used, ip_address, user_agent, expires_at
     FROM user_sessions 
     WHERE user_id = ? AND expires_at > datetime('now')
     ORDER BY last_used DESC`,
    [req.user!.id]
  );

  res.json({
    sessions: sessions.map(session => ({
      id: session.id,
      createdAt: session.created_at,
      lastUsed: session.last_used,
      ipAddress: session.ip_address,
      userAgent: session.user_agent,
      expiresAt: session.expires_at
    }))
  });
}));

// Revoke session
router.delete('/sessions/:sessionId', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const db = getDatabase();
  const run = promisify(db.run.bind(db));

  await run(
    'DELETE FROM user_sessions WHERE id = ? AND user_id = ?',
    [req.params.sessionId, req.user!.id]
  );

  res.json({ message: 'Session revoked successfully' });
}));

export default router;