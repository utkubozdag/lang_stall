import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Initialize database tables
export const initDb = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        native_language TEXT,
        learning_language TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS texts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        language TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS vocabulary (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        word TEXT NOT NULL,
        translation TEXT NOT NULL,
        context TEXT,
        language TEXT NOT NULL,
        next_review TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        interval INTEGER DEFAULT 0,
        ease_factor REAL DEFAULT 2.5,
        review_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        vocabulary_id INTEGER NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
        quality INTEGER NOT NULL,
        reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_vocabulary_user_id ON vocabulary(user_id);
      CREATE INDEX IF NOT EXISTS idx_vocabulary_next_review ON vocabulary(next_review);
      CREATE INDEX IF NOT EXISTS idx_texts_user_id ON texts(user_id);
    `);

    // Add email verification columns if they don't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='verified') THEN
          ALTER TABLE users ADD COLUMN verified BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='verification_token') THEN
          ALTER TABLE users ADD COLUMN verification_token TEXT;
        END IF;
      END $$;
    `);

    console.log('Database initialized');
  } finally {
    client.release();
  }
};

export default pool;
