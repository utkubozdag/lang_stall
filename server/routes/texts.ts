import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';
import pool from '../db.js';

const router = Router();

// Get all texts for a user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await pool.query(
      'SELECT * FROM texts WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get texts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single text
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Validate ID is a positive integer
    const textId = parseInt(id, 10);
    if (isNaN(textId) || textId <= 0) {
      return res.status(400).json({ error: 'Invalid text ID' });
    }

    const result = await pool.query(
      'SELECT * FROM texts WHERE id = $1 AND user_id = $2',
      [textId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Text not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get text error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create text
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { title, content, language } = req.body;

    if (!title || !content || !language) {
      return res.status(400).json({ error: 'Title, content, and language are required' });
    }

    // Input length validation
    if (title.length > 200) {
      return res.status(400).json({ error: 'Title too long (max 200 characters)' });
    }

    if (content.length > 100000) {
      return res.status(400).json({ error: 'Content too long (max 100,000 characters)' });
    }

    if (language.length > 50) {
      return res.status(400).json({ error: 'Language name too long' });
    }

    const result = await pool.query(
      'INSERT INTO texts (user_id, title, content, language) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, title, content, language]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create text error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete text
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Validate ID is a positive integer
    const textId = parseInt(id, 10);
    if (isNaN(textId) || textId <= 0) {
      return res.status(400).json({ error: 'Invalid text ID' });
    }

    const result = await pool.query(
      'DELETE FROM texts WHERE id = $1 AND user_id = $2',
      [textId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Text not found' });
    }

    res.json({ message: 'Text deleted' });
  } catch (error) {
    console.error('Delete text error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
