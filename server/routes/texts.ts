import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';
import pool from '../db.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import * as cheerio from 'cheerio';
import dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

// SSRF Protection: Check if IP is private/internal
const isPrivateIP = (ip: string): boolean => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) {
    // Check for IPv6 loopback
    return ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd');
  }

  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 127.0.0.0/8 (loopback)
  if (parts[0] === 127) return true;
  // 169.254.0.0/16 (link-local, includes cloud metadata)
  if (parts[0] === 169 && parts[1] === 254) return true;
  // 0.0.0.0
  if (parts.every(p => p === 0)) return true;

  return false;
};

// Validate URL is safe to fetch (SSRF protection)
const isUrlSafe = async (urlString: string): Promise<{ safe: boolean; error?: string }> => {
  try {
    const url = new URL(urlString);

    // Only allow http and https
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { safe: false, error: 'Only HTTP and HTTPS URLs are allowed' };
    }

    // Block common internal hostnames
    const blockedHosts = ['localhost', 'internal', 'intranet', 'corp', 'local'];
    const hostname = url.hostname.toLowerCase();
    if (blockedHosts.some(h => hostname === h || hostname.endsWith('.' + h))) {
      return { safe: false, error: 'Internal hostnames are not allowed' };
    }

    // Resolve hostname to IP and check if private
    try {
      const { address } = await dnsLookup(url.hostname);
      if (isPrivateIP(address)) {
        return { safe: false, error: 'URLs pointing to private/internal networks are not allowed' };
      }
    } catch {
      return { safe: false, error: 'Could not resolve hostname' };
    }

    return { safe: true };
  } catch {
    return { safe: false, error: 'Invalid URL format' };
  }
};

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

    // Type validation
    if (typeof title !== 'string' || typeof content !== 'string' || typeof language !== 'string') {
      return res.status(400).json({ error: 'Invalid input types' });
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

    // Type validation
    if (typeof title !== 'string' || typeof language !== 'string') {
      return res.status(400).json({ error: 'Invalid input types' });
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

// Import from URL
router.post('/from-url', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { url, title, language } = req.body;

    if (!url || !language) {
      return res.status(400).json({ error: 'URL and language are required' });
    }

    // Type validation
    if (typeof url !== 'string' || typeof language !== 'string' || (title && typeof title !== 'string')) {
      return res.status(400).json({ error: 'Invalid input types' });
    }

    // Validate URL with SSRF protection
    const urlCheck = await isUrlSafe(url);
    if (!urlCheck.safe) {
      return res.status(400).json({ error: urlCheck.error || 'Invalid URL' });
    }

    if (title && title.length > 200) {
      return res.status(400).json({ error: 'Title too long (max 200 characters)' });
    }

    if (language.length > 50) {
      return res.status(400).json({ error: 'Language name too long' });
    }

    // Fetch the URL
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LangStall/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      return res.status(400).json({ error: `Failed to fetch URL: ${response.status}` });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return res.status(400).json({ error: 'URL must point to an HTML or text page' });
    }

    const html = await response.text();

    // Parse HTML and extract text
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .ad, .ads, .advertisement, .sidebar, .menu, .navigation, .comments, .social, .share').remove();

    // Try to find main content
    let content = '';
    const mainSelectors = ['article', 'main', '.content', '.post', '.article', '.entry-content', '#content', '.post-content'];

    for (const selector of mainSelectors) {
      const el = $(selector);
      if (el.length && el.text().trim().length > 200) {
        content = el.text();
        break;
      }
    }

    // Fallback to body
    if (!content) {
      content = $('body').text();
    }

    // Clean up whitespace
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    if (!content || content.length < 50) {
      return res.status(400).json({ error: 'Could not extract meaningful content from URL' });
    }

    // Limit content length
    if (content.length > 500000) {
      content = content.substring(0, 500000);
    }

    // Use provided title or extract from page
    const pageTitle = title || $('title').text().trim() || $('h1').first().text().trim() || 'Imported from URL';
    const finalTitle = pageTitle.substring(0, 200);

    const result = await pool.query(
      'INSERT INTO texts (user_id, title, content, language) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, finalTitle, content, language]
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('URL import error:', error);
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return res.status(400).json({ error: 'URL took too long to respond' });
    }
    res.status(500).json({ error: 'Failed to import from URL' });
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
