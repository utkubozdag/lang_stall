import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db.js';
import authRoutes from './routes/auth.js';
import translateRoutes from './routes/translate.js';
import vocabularyRoutes from './routes/vocabulary.js';
import textsRoutes from './routes/texts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Trust proxy for Railway/production (needed for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests, please try again later' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 auth attempts per window
  message: { error: 'Too many login attempts, please try again later' },
});

const translateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 translations per minute
  message: { error: 'Too many translation requests, please slow down' },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' })); // Limit body size
app.use(generalLimiter);

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/translate', translateLimiter, translateRoutes);
app.use('/api/vocabulary', vocabularyRoutes);
app.use('/api/texts', textsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve static files
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Initialize database and start server
const start = async () => {
  try {
    await initDb();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
