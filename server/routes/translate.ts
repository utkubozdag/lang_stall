import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';
import pool from '../db.js';

const router = Router();

// Gemini 2.0 Flash pricing (per 1M tokens)
const GEMINI_INPUT_PRICE = 0.10;  // $0.10 per 1M input tokens
const GEMINI_OUTPUT_PRICE = 0.30; // $0.30 per 1M output tokens

// Grok pricing (per 1M tokens) - grok-4-1-fast-non-reasoning (under 128k)
const GROK_INPUT_PRICE = 0.20;   // $0.20 per 1M input tokens
const GROK_OUTPUT_PRICE = 0.50;  // $0.50 per 1M output tokens

type ModelProvider = 'gemini' | 'grok';

// Estimate tokens (roughly 4 characters per token)
const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4);
};

// Sanitize markdown formatting from LLM output
const sanitizeMarkdown = (text: string): string => {
  return text
    .replace(/\*+/g, '')       // Remove all asterisks (bold/italic markers)
    .replace(/_+/g, ' ')       // Replace underscores with space (to preserve word boundaries)
    .replace(/`/g, '')         // Remove all backticks (code markers)
    .replace(/\s+/g, ' ')      // Normalize whitespace
    .trim();
};

// Log API cost to database
const logApiCost = async (inputTokens: number, outputTokens: number, provider: ModelProvider = 'gemini'): Promise<void> => {
  try {
    const inputPrice = provider === 'grok' ? GROK_INPUT_PRICE : GEMINI_INPUT_PRICE;
    const outputPrice = provider === 'grok' ? GROK_OUTPUT_PRICE : GEMINI_OUTPUT_PRICE;
    const cost = (inputTokens * inputPrice / 1_000_000) +
                 (outputTokens * outputPrice / 1_000_000);

    // Get first day of current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStr = monthStart.toISOString().split('T')[0];

    await pool.query(`
      INSERT INTO api_costs (month, input_tokens, output_tokens, cost_usd, request_count)
      VALUES ($1, $2, $3, $4, 1)
      ON CONFLICT (month) DO UPDATE SET
        input_tokens = api_costs.input_tokens + $2,
        output_tokens = api_costs.output_tokens + $3,
        cost_usd = api_costs.cost_usd + $4,
        request_count = api_costs.request_count + 1,
        updated_at = CURRENT_TIMESTAMP
    `, [monthStr, inputTokens, outputTokens, cost]);
  } catch (error) {
    console.error('Failed to log API cost:', error);
    // Don't throw - cost logging shouldn't break translations
  }
};

// Call Grok API for translation
const callGrokAPI = async (prompt: string): Promise<string> => {
  const XAI_API_KEY = process.env.XAI_API_KEY;
  if (!XAI_API_KEY) {
    throw new Error('XAI_API_KEY not configured');
  }

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'grok-4-1-fast-non-reasoning',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    }),
  });

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    error?: { message?: string };
  };

  if (!response.ok) {
    console.error('Grok API error:', data);
    throw new Error('Grok translation failed');
  }

  const result = data.choices?.[0]?.message?.content || 'Translation not available';

  // Log cost
  const inputTokens = data.usage?.prompt_tokens || estimateTokens(prompt);
  const outputTokens = data.usage?.completion_tokens || estimateTokens(result);
  logApiCost(inputTokens, outputTokens, 'grok');

  return result;
};

// Call Gemini API for translation
const callGeminiAPI = async (prompt: string): Promise<string> => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  const data = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    console.error('Gemini API error:', data);
    throw new Error('Gemini translation failed');
  }

  const result = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Translation not available';

  // Log cost
  const inputTokens = estimateTokens(prompt);
  const outputTokens = estimateTokens(result);
  logApiCost(inputTokens, outputTokens, 'gemini');

  return result;
};

// Translate word or phrase
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { text, context, targetLanguage, sourceLanguage, generateMnemonic, model } = req.body;
    const provider: ModelProvider = model === 'grok' ? 'grok' : 'gemini';

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Type validation
    if (typeof text !== 'string') {
      return res.status(400).json({ error: 'Text must be a string' });
    }

    // Length validation
    if (text.length > 1000) {
      return res.status(400).json({ error: 'Text too long (max 1000 characters)' });
    }

    // Word count limit (max 15 words per phrase)
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount > 15) {
      return res.status(400).json({ error: 'Please select at most 15 words at a time' });
    }

    // Validate optional parameters
    if (context && (typeof context !== 'string' || context.length > 500)) {
      return res.status(400).json({ error: 'Context too long (max 500 characters)' });
    }

    if (targetLanguage && (typeof targetLanguage !== 'string' || targetLanguage.length > 50)) {
      return res.status(400).json({ error: 'Invalid target language' });
    }

    if (sourceLanguage && (typeof sourceLanguage !== 'string' || sourceLanguage.length > 50)) {
      return res.status(400).json({ error: 'Invalid source language' });
    }

    // Determine if it's a word/phrase or a longer passage (wordCount already calculated above)
    const isLongText = wordCount > 5;

    let prompt: string;

    const target = targetLanguage || 'English';

    // Mnemonic instruction - phonetic keyword method
    const shouldGenerateMnemonicPrompt = generateMnemonic && !isLongText;

    if (isLongText) {
      // For sentences and passages - provide full translation
      prompt = `Translate this ${sourceLanguage || ''} text to ${target}.

Text: "${text}"

Respond entirely in ${target} using this exact format (plain text only, no markdown):
Translation: [your translation here]

Keep the translation natural and accurate.`;
    } else if (context) {
      // For words/short phrases with context
      prompt = `You are a translator. Translate this ${sourceLanguage || ''} word/phrase to ${target}.

Word: "${text}"
Context: "${context}"

Write EVERYTHING in ${target}.

Format (each on its own line):
Meaning: [translation]
Explanation: [brief grammar note - part of speech, usage]${shouldGenerateMnemonicPrompt ? `
Mnemonic: [Create a memorable sentence using ${target} words that PHONETICALLY APPROXIMATE the sound of "${text}". The sentence must also connect to the word's meaning. Example: For Spanish "pato" (duck), you might write "I PAT O' my rubber duck in the bath" - where "PAT O" sounds like "pato". Make it vivid and memorable.]` : ''}`;
    } else {
      // For words/short phrases without context
      prompt = `You are a translator. Translate this ${sourceLanguage || ''} word/phrase to ${target}.

Word: "${text}"

Write EVERYTHING in ${target}.

Format (each on its own line):
Meaning: [translation]
Explanation: [brief grammar note - part of speech, usage]${shouldGenerateMnemonicPrompt ? `
Mnemonic: [Create a memorable sentence using ${target} words that PHONETICALLY APPROXIMATE the sound of "${text}". The sentence must also connect to the word's meaning. Example: For Spanish "pato" (duck), you might write "I PAT O' my rubber duck in the bath" - where "PAT O" sounds like "pato". Make it vivid and memorable.]` : ''}`;
    }

    // Call the appropriate API based on provider
    const fullResponse = provider === 'grok'
      ? await callGrokAPI(prompt)
      : await callGeminiAPI(prompt);

    // Always filter out mnemonic lines from translation (LLM may add them unprompted)
    // But only return mnemonic value when generateMnemonic is true
    const lines = fullResponse.split('\n');
    const mnemonicLine = lines.find(line => line.toLowerCase().startsWith('mnemonic:'));

    // Always remove mnemonic lines from translation
    const translation = lines.filter(line => !line.toLowerCase().startsWith('mnemonic:')).join('\n').trim();

    // Only capture mnemonic value when requested and not long text
    let mnemonic: string | undefined;
    if (generateMnemonic && !isLongText && mnemonicLine) {
      mnemonic = sanitizeMarkdown(mnemonicLine.substring('mnemonic:'.length));
    }

    res.json({ translation, mnemonic });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
