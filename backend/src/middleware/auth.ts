import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database/init';
import { promisify } from 'util';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    plan: string;
    credits: number;
  };
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    
    // Verify user exists and session is valid
    const db = getDatabase();
    const get = promisify(db.get.bind(db));
    
    const user = await get(
      'SELECT id, email, plan, credits FROM users WHERE id = ? AND is_active = 1',
      [decoded.userId]
    );

    if (!user) {
      res.status(401).json({ error: 'Invalid token or user not found' });
      return;
    }

    // Check if session exists and is not expired
    const session = await get(
      'SELECT id FROM user_sessions WHERE user_id = ? AND token_hash = ? AND expires_at > datetime("now")',
      [decoded.userId, decoded.sessionId]
    );

    if (!session) {
      res.status(401).json({ error: 'Session expired or invalid' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function requirePlan(allowedPlans: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedPlans.includes(req.user.plan)) {
      res.status(403).json({ 
        error: 'Insufficient plan level',
        required: allowedPlans,
        current: req.user.plan
      });
      return;
    }

    next();
  };
}

export function requireCredits(minCredits: number = 1) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.user.credits < minCredits) {
      res.status(402).json({ 
        error: 'Insufficient credits',
        required: minCredits,
        available: req.user.credits
      });
      return;
    }

    next();
  };
}