import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';

// General API rate limiter
const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req: Request) => req.ip,
  points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // Number of requests
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000, // Per 15 minutes (in seconds)
});

// AI generation rate limiter (more restrictive)
const aiRateLimiter = new RateLimiterMemory({
  keyGenerator: (req: Request) => req.ip,
  points: 10, // 10 AI requests
  duration: 3600, // Per hour
});

// Authentication rate limiter (for login attempts)
const authRateLimiter = new RateLimiterMemory({
  keyGenerator: (req: Request) => req.ip,
  points: 5, // 5 attempts
  duration: 900, // Per 15 minutes
});

export async function rateLimiterMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: secs,
      message: 'Rate limit exceeded. Please try again later.'
    });
  }
}

export async function aiRateLimiterMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await aiRateLimiter.consume(req.ip);
    next();
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    res.status(429).json({
      error: 'AI rate limit exceeded',
      retryAfter: secs,
      message: 'Too many AI requests. Please upgrade your plan or try again later.'
    });
  }
}

export async function authRateLimiterMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await authRateLimiter.consume(req.ip);
    next();
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    res.status(429).json({
      error: 'Too many authentication attempts',
      retryAfter: secs,
      message: 'Too many login attempts. Please try again later.'
    });
  }
}

export { rateLimiterMiddleware as rateLimiter };