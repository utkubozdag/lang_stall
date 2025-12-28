import { Pool } from 'pg';

// Configure SSL for database connection
// In production, prefer proper SSL validation. rejectUnauthorized: false is used
// as a fallback for managed databases with self-signed certs (Railway, Heroku, etc.)
const getSslConfig = () => {
  if (process.env.NODE_ENV !== 'production') {
    return false;
  }

  // If a CA certificate is provided, use it for proper validation
  if (process.env.DATABASE_CA_CERT) {
    return {
      rejectUnauthorized: true,
      ca: process.env.DATABASE_CA_CERT,
    };
  }

  // Fallback for managed databases with self-signed certs
  // Note: This disables certificate validation - only use with trusted providers
  return { rejectUnauthorized: false };
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: getSslConfig(),
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
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='verification_token_expires') THEN
          ALTER TABLE users ADD COLUMN verification_token_expires TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='target_language') THEN
          ALTER TABLE users ADD COLUMN target_language TEXT DEFAULT 'English';
        END IF;
      END $$;
    `);

    // Add mnemonic column to vocabulary table for Link and Story Method
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vocabulary' AND column_name='mnemonic') THEN
          ALTER TABLE vocabulary ADD COLUMN mnemonic TEXT;
        END IF;
      END $$;
    `);

    // Create sustainability tracking tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_costs (
        id SERIAL PRIMARY KEY,
        month DATE NOT NULL,
        input_tokens INTEGER DEFAULT 0,
        output_tokens INTEGER DEFAULT 0,
        cost_usd DECIMAL(10, 6) DEFAULT 0,
        request_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(month)
      );

      CREATE TABLE IF NOT EXISTS donations (
        id SERIAL PRIMARY KEY,
        kofi_transaction_id TEXT UNIQUE,
        amount DECIMAL(10, 2) NOT NULL,
        currency TEXT DEFAULT 'USD',
        donation_type TEXT DEFAULT 'Donation',
        month DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_api_costs_month ON api_costs(month);
      CREATE INDEX IF NOT EXISTS idx_donations_month ON donations(month);
    `);

    // Migrate donations table from Stripe to Ko-fi if needed
    await client.query(`
      DO $$
      BEGIN
        -- Add kofi_transaction_id if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donations' AND column_name='kofi_transaction_id') THEN
          ALTER TABLE donations ADD COLUMN kofi_transaction_id TEXT UNIQUE;
        END IF;
        -- Add currency if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donations' AND column_name='currency') THEN
          ALTER TABLE donations ADD COLUMN currency TEXT DEFAULT 'USD';
        END IF;
        -- Add donation_type if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donations' AND column_name='donation_type') THEN
          ALTER TABLE donations ADD COLUMN donation_type TEXT DEFAULT 'Donation';
        END IF;
        -- Rename amount_usd to amount if needed
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donations' AND column_name='amount_usd') THEN
          ALTER TABLE donations RENAME COLUMN amount_usd TO amount;
        END IF;
      END $$;
    `);

    console.log('Database initialized');
  } finally {
    client.release();
  }
};

export default pool;
