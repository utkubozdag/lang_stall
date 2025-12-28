import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';
import pool from '../db.js';

const router = Router();

// Gemini 2.0 Flash pricing (per 1M tokens)
const GEMINI_INPUT_PRICE = 0.10;  // $0.10 per 1M input tokens
const GEMINI_OUTPUT_PRICE = 0.30; // $0.30 per 1M output tokens

// Estimate tokens (roughly 4 characters per token)
const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4);
};

// Sanitize markdown formatting from LLM output
const sanitizeMarkdown = (text: string): string => {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove **bold**
    .replace(/\*([^*]+)\*/g, '$1')       // Remove *italic*
    .replace(/__([^_]+)__/g, '$1')       // Remove __bold__
    .replace(/_([^_]+)_/g, '$1')         // Remove _italic_
    .replace(/`([^`]+)`/g, '$1')         // Remove `code`
    .trim();
};

// Log API cost to database
const logApiCost = async (inputTokens: number, outputTokens: number): Promise<void> => {
  try {
    const cost = (inputTokens * GEMINI_INPUT_PRICE / 1_000_000) +
                 (outputTokens * GEMINI_OUTPUT_PRICE / 1_000_000);

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

// Translate word or phrase using Gemini
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { text, context, targetLanguage, sourceLanguage, generateMnemonic } = req.body;

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

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    // Determine if it's a word/phrase or a longer passage (wordCount already calculated above)
    const isLongText = wordCount > 5;

    let prompt: string;

    const target = targetLanguage || 'English';

    // Mnemonic instruction using StoryWeave method (only for short words/phrases)
    const mnemonicInstruction = generateMnemonic && !isLongText ? `
Mnemonic: [Create ONE memorable sentence using ${target} words that sound like "${text}" AND logically relate to its meaning. Requirements: (1) Must create a vivid mental image you can visualize, (2) The story must make logical sense - no random word salad, (3) Sound-alike words should naturally fit the scene. Output ONLY the final sentence as plain text - no bold, italic, or any formatting.]` : '';

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

CRITICAL: You MUST write EVERYTHING in ${target} (except for the Mnemonic which should be in ${target} but can reference the original word sound).

Format (use ${target} language only):
Meaning: [translation in ${target}]
Explanation: [grammar note in ${target} - tense, formality, usage]${mnemonicInstruction}`;
    } else {
      // For words/short phrases without context
      prompt = `You are a translator. Translate this ${sourceLanguage || ''} word/phrase to ${target}.

Word: "${text}"

CRITICAL: You MUST write EVERYTHING in ${target} (except for the Mnemonic which should be in ${target} but can reference the original word sound).

Format (use ${target} language only):
Meaning: [translation in ${target}]
Explanation: [grammar note in ${target} - tense, formality, usage]${mnemonicInstruction}`;
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
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      console.error('Gemini API error:', data);
      return res.status(500).json({ error: 'Translation failed' });
    }

    const fullResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Translation not available';

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

    // Log API cost (async, don't wait)
    const inputTokens = estimateTokens(prompt);
    const outputTokens = estimateTokens(fullResponse);
    logApiCost(inputTokens, outputTokens);

    res.json({ translation, mnemonic });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
