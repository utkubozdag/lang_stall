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

    // Basic type validation only
    if (typeof text !== 'string') {
      return res.status(400).json({ error: 'Text must be a string' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    // Count words to determine if it's a word/phrase or a longer passage
    const wordCount = text.trim().split(/\s+/).length;
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
      prompt = `Translate this ${sourceLanguage || ''} word/phrase to ${target}.

Word: "${text}"
Context: "${context}"

IMPORTANT: Write your ENTIRE response in ${target}, including the explanation.

Respond in this exact format (plain text only, no markdown):
Meaning: [2-3 common translations in ${target}, separated by commas]
Explanation: [one brief sentence in ${target} about usage in this context]`;
    } else {
      // For words/short phrases without context
      prompt = `Translate this ${sourceLanguage || ''} word/phrase to ${target}.

Word: "${text}"

IMPORTANT: Write your ENTIRE response in ${target}, including the explanation.

Respond in this exact format (plain text only, no markdown):
Meaning: [2-3 common translations in ${target}, separated by commas]
Explanation: [one brief sentence in ${target} about common usage]`;
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
