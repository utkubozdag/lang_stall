import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';

const router = Router();

// Translate word or phrase using Gemini
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { text, context, targetLanguage, sourceLanguage } = req.body;

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

CRITICAL: You MUST write EVERYTHING in ${target}. Do NOT use English at all.

Format (use ${target} language only):
Meaning: [translation in ${target}]
Explanation: [grammar note in ${target} - tense, formality, usage]`;
    } else {
      // For words/short phrases without context
      prompt = `You are a translator. Translate this ${sourceLanguage || ''} word/phrase to ${target}.

Word: "${text}"

CRITICAL: You MUST write EVERYTHING in ${target}. Do NOT use English at all.

Format (use ${target} language only):
Meaning: [translation in ${target}]
Explanation: [grammar note in ${target} - tense, formality, usage]`;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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

    const translation = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Translation not available';

    res.json({ translation });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
