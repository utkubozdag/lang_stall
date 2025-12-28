import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';
import pool from '../db.js';

const router = Router();

// Get all vocabulary for a user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await pool.query(
      'SELECT * FROM vocabulary WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get vocabulary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get vocabulary due for review
router.get('/due', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await pool.query(
      'SELECT * FROM vocabulary WHERE user_id = $1 AND next_review <= NOW() ORDER BY next_review ASC',
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get due vocabulary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add vocabulary
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { word, translation, context, language, mnemonic } = req.body;

    if (!word || !translation || !language) {
      return res.status(400).json({ error: 'Word, translation, and language are required' });
    }

    // Input length validation
    if (word.length > 200) {
      return res.status(400).json({ error: 'Word too long (max 200 characters)' });
    }

    if (translation.length > 2000) {
      return res.status(400).json({ error: 'Translation too long' });
    }

    if (context && context.length > 500) {
      return res.status(400).json({ error: 'Context too long' });
    }

    if (language.length > 50) {
      return res.status(400).json({ error: 'Language name too long' });
    }

    if (mnemonic && mnemonic.length > 500) {
      return res.status(400).json({ error: 'Mnemonic too long' });
    }

    // Check if word already exists for this user
    const existing = await pool.query(
      'SELECT * FROM vocabulary WHERE user_id = $1 AND word = $2 AND language = $3',
      [userId, word, language]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Word already in your vocabulary' });
    }

    const result = await pool.query(
      'INSERT INTO vocabulary (user_id, word, translation, context, language, mnemonic) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [userId, word, translation, context, language, mnemonic || null]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Add vocabulary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete vocabulary
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Validate ID is a positive integer
    const vocabId = parseInt(id, 10);
    if (isNaN(vocabId) || vocabId <= 0) {
      return res.status(400).json({ error: 'Invalid vocabulary ID' });
    }

    const result = await pool.query(
      'DELETE FROM vocabulary WHERE id = $1 AND user_id = $2',
      [vocabId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Vocabulary not found' });
    }

    res.json({ message: 'Vocabulary deleted' });
  } catch (error) {
    console.error('Delete vocabulary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Export vocabulary as CSV
router.get('/export', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await pool.query(
      'SELECT word, translation, context, language, mnemonic, created_at FROM vocabulary WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    // Parse translation to extract meaning and explanation
    const parseTranslation = (translation: string): { meaning: string; explanation: string } => {
      const lines = translation.split('\n').map(l => l.trim()).filter(l => l);
      let meaning = '';
      let explanation = '';

      for (const line of lines) {
        if (line.toLowerCase().startsWith('meaning:')) {
          meaning = line.substring('meaning:'.length).trim();
        } else if (line.toLowerCase().startsWith('explanation:')) {
          explanation = line.substring('explanation:'.length).trim();
        } else if (line.toLowerCase().startsWith('translation:')) {
          // For longer passages that use "Translation:" format
          meaning = line.substring('translation:'.length).trim();
        }
      }

      // If no structured format found, use the whole translation as meaning
      if (!meaning && !explanation) {
        meaning = translation.trim();
      }

      return { meaning, explanation };
    };

    // Escape CSV field (handle quotes and commas)
    const escapeCSV = (field: string): string => {
      if (!field) return '';
      // If field contains comma, newline, or quote, wrap in quotes and escape internal quotes
      if (field.includes(',') || field.includes('\n') || field.includes('"')) {
        return '"' + field.replace(/"/g, '""') + '"';
      }
      return field;
    };

    // Build CSV content
    const headers = ['word', 'meaning', 'explanation', 'mnemonic', 'context', 'language', 'created_at'];
    const csvRows = [headers.join(',')];

    for (const row of result.rows) {
      const { meaning, explanation } = parseTranslation(row.translation);
      const csvRow = [
        escapeCSV(row.word),
        escapeCSV(meaning),
        escapeCSV(explanation),
        escapeCSV(row.mnemonic || ''),
        escapeCSV(row.context || ''),
        escapeCSV(row.language),
        escapeCSV(new Date(row.created_at).toISOString().split('T')[0]),
      ];
      csvRows.push(csvRow.join(','));
    }

    const csvContent = csvRows.join('\n');

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=vocabulary-export.csv');
    res.send(csvContent);
  } catch (error) {
    console.error('Export vocabulary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Review vocabulary (spaced repetition)
router.post('/:id/review', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { quality } = req.body; // 0-5 quality rating

    // Validate ID is a positive integer
    const vocabId = parseInt(id, 10);
    if (isNaN(vocabId) || vocabId <= 0) {
      return res.status(400).json({ error: 'Invalid vocabulary ID' });
    }

    // Validate quality is a number between 0-5
    const qualityNum = Number(quality);
    if (isNaN(qualityNum) || !Number.isInteger(qualityNum) || qualityNum < 0 || qualityNum > 5) {
      return res.status(400).json({ error: 'Quality must be an integer between 0 and 5' });
    }

    const vocabResult = await pool.query(
      'SELECT * FROM vocabulary WHERE id = $1 AND user_id = $2',
      [vocabId, userId]
    );

    if (vocabResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vocabulary not found' });
    }

    const vocab = vocabResult.rows[0];

    // SM-2 algorithm for spaced repetition
    let interval = vocab.interval;
    let ease_factor = vocab.ease_factor;
    let review_count = vocab.review_count + 1;

    if (qualityNum >= 3) {
      if (review_count === 1) {
        interval = 1;
      } else if (review_count === 2) {
        interval = 6;
      } else {
        interval = Math.round(interval * ease_factor);
      }
    } else {
      review_count = 0;
      interval = 1;
    }

    ease_factor = ease_factor + (0.1 - (5 - qualityNum) * (0.08 + (5 - qualityNum) * 0.02));
    if (ease_factor < 1.3) ease_factor = 1.3;

    const next_review = new Date(Date.now() + interval * 24 * 60 * 60 * 1000).toISOString();

    await pool.query(
      'UPDATE vocabulary SET interval = $1, ease_factor = $2, review_count = $3, next_review = $4 WHERE id = $5',
      [interval, ease_factor, review_count, next_review, vocabId]
    );

    await pool.query(
      'INSERT INTO reviews (vocabulary_id, quality) VALUES ($1, $2)',
      [vocabId, qualityNum]
    );

    const updatedResult = await pool.query('SELECT * FROM vocabulary WHERE id = $1', [vocabId]);

    res.json(updatedResult.rows[0]);
  } catch (error) {
    console.error('Review vocabulary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
