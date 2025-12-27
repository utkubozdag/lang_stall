import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';
import pool from '../db.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import os from 'os';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/plain', 'application/epub+zip'];
    const allowedExtensions = ['.txt', '.epub'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt and .epub files are allowed'));
    }
  },
});

// Helper to parse epub content
const parseEpub = async (buffer: Buffer): Promise<string> => {
  // Write buffer to temp file (epub2 requires file path)
  const tempPath = path.join(os.tmpdir(), `epub-${Date.now()}.epub`);
  await fs.promises.writeFile(tempPath, buffer);

  try {
    // Dynamic import to handle epub2's async nature
    const { EPub } = await import('epub2');

    return new Promise((resolve, reject) => {
      const epub = new EPub(tempPath);

      epub.on('end', async () => {
        const chapters: string[] = [];

        // Process chapters sequentially
        const processChapter = (index: number): Promise<void> => {
          return new Promise((res) => {
            if (index >= epub.flow.length) {
              res();
              return;
            }

            const chapter = epub.flow[index];
            if (!chapter.id) {
              processChapter(index + 1).then(res);
              return;
            }

            epub.getChapter(chapter.id, (err: Error, content?: string) => {
              if (!err && content) {
                // Strip HTML tags and clean up
                const text = content
                  .replace(/<[^>]*>/g, ' ')
                  .replace(/&nbsp;/g, ' ')
                  .replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/&quot;/g, '"')
                  .replace(/&#39;/g, "'")
                  .replace(/\s+/g, ' ')
                  .trim();
                if (text) {
                  chapters.push(text);
                }
              }
              processChapter(index + 1).then(res);
            });
          });
        };

        await processChapter(0);
        resolve(chapters.join('\n\n'));
      });

      epub.on('error', (err: Error) => {
        reject(err);
      });

      epub.parse();
    });
  } finally {
    // Clean up temp file
    await fs.promises.unlink(tempPath).catch(() => {});
  }
};

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

// Upload file (txt or epub)
router.post('/upload', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const file = req.file;
    const { title, language } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!title || !language) {
      return res.status(400).json({ error: 'Title and language are required' });
    }

    if (title.length > 200) {
      return res.status(400).json({ error: 'Title too long (max 200 characters)' });
    }

    if (language.length > 50) {
      return res.status(400).json({ error: 'Language name too long' });
    }

    let content: string;
    const ext = path.extname(file.originalname).toLowerCase();

    if (ext === '.txt') {
      content = file.buffer.toString('utf-8');
    } else if (ext === '.epub') {
      content = await parseEpub(file.buffer);
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'File is empty or could not be parsed' });
    }

    // Limit content length
    if (content.length > 500000) {
      content = content.substring(0, 500000);
    }

    const result = await pool.query(
      'INSERT INTO texts (user_id, title, content, language) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, title, content, language]
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Upload text error:', error);
    if (error.message === 'Only .txt and .epub files are allowed') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update text
router.patch('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { title, content, language } = req.body;

    // Validate ID is a positive integer
    const textId = parseInt(id, 10);
    if (isNaN(textId) || textId <= 0) {
      return res.status(400).json({ error: 'Invalid text ID' });
    }

    // Check text exists and belongs to user
    const existing = await pool.query(
      'SELECT * FROM texts WHERE id = $1 AND user_id = $2',
      [textId, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Text not found' });
    }

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (title !== undefined) {
      if (typeof title !== 'string' || title.length > 200) {
        return res.status(400).json({ error: 'Title too long (max 200 characters)' });
      }
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }

    if (content !== undefined) {
      if (typeof content !== 'string' || content.length > 500000) {
        return res.status(400).json({ error: 'Content too long (max 500,000 characters)' });
      }
      updates.push(`content = $${paramCount++}`);
      values.push(content);
    }

    if (language !== undefined) {
      if (typeof language !== 'string' || language.length > 50) {
        return res.status(400).json({ error: 'Language name too long' });
      }
      updates.push(`language = $${paramCount++}`);
      values.push(language);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(textId, userId);

    const result = await pool.query(
      `UPDATE texts SET ${updates.join(', ')} WHERE id = $${paramCount++} AND user_id = $${paramCount} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update text error:', error);
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
