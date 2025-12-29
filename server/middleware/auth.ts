import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { User } from '../types.js';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export interface AuthRequest extends Request {
  user?: User;
}

// Default anonymous user ID (created in db.ts initDb)
const ANONYMOUS_USER_ID = 1;

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  let userId = ANONYMOUS_USER_ID;

  // If token provided, try to verify it
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as { userId: number };
      userId = decoded.userId;
    } catch {
      // Invalid token, fall back to anonymous user
    }
  }

  try {
    // Exclude password from query to prevent accidental exposure
    const result = await pool.query(
      'SELECT id, email, name, native_language, learning_language, target_language, verified FROM users WHERE id = $1',
      [userId]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Database error' });
  }
};

export const generateToken = (userId: number): string => {
  return jwt.sign({ userId }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d' });
};
