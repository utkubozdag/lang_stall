import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import pool from '../db.js';

const router = Router();

interface KofiPayload {
  verification_token: string;
  message_id: string;
  timestamp: string;
  type: 'Donation' | 'Subscription' | 'Commission' | 'Shop Order';
  is_public: boolean;
  from_name: string;
  message: string | null;
  amount: string;
  url: string;
  email: string;
  currency: string;
  is_subscription_payment: boolean;
  is_first_subscription_payment: boolean;
  kofi_transaction_id: string;
  shop_items: unknown | null;
  tier_name: string | null;
  shipping: unknown | null;
}

// Get current month's start date
const getCurrentMonthStart = (): string => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return monthStart.toISOString().split('T')[0];
};

// Ko-fi webhook endpoint
// Ko-fi sends data as form-urlencoded with a 'data' field containing JSON
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    // Ko-fi sends the payload in a 'data' field as a JSON string
    const dataString = req.body.data;
    if (!dataString) {
      console.error('Ko-fi webhook: No data field in request');
      return res.status(400).json({ error: 'Missing data field' });
    }

    const payload: KofiPayload = JSON.parse(dataString);

    // Verify the token
    const verificationToken = process.env.KOFI_VERIFICATION_TOKEN;
    if (!verificationToken) {
      console.error('Ko-fi webhook: KOFI_VERIFICATION_TOKEN not configured');
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    // Use timing-safe comparison to prevent timing attacks
    const tokenBuffer = Buffer.from(payload.verification_token || '');
    const expectedBuffer = Buffer.from(verificationToken);
    if (tokenBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(tokenBuffer, expectedBuffer)) {
      console.error('Ko-fi webhook: Invalid verification token');
      return res.status(401).json({ error: 'Invalid verification token' });
    }

    // Only process donations and subscriptions
    const validTypes = ['Donation', 'Subscription'];
    if (!validTypes.includes(payload.type)) {
      console.log(`Ko-fi webhook: Ignoring type ${payload.type}`);
      return res.status(200).json({ message: 'Ignored' });
    }

    const monthStart = getCurrentMonthStart();
    const amount = parseFloat(payload.amount);

    // Insert the donation (ignore duplicates)
    await pool.query(
      `INSERT INTO donations (kofi_transaction_id, amount, currency, donation_type, month)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (kofi_transaction_id) DO NOTHING`,
      [payload.kofi_transaction_id, amount, payload.currency, payload.type, monthStart]
    );

    console.log(`Ko-fi webhook: Received ${payload.type} of ${payload.currency} ${payload.amount}`);

    // Ko-fi expects a 200 response
    res.status(200).json({ message: 'Success' });
  } catch (error) {
    console.error('Ko-fi webhook error:', error);
    // Still return 200 to prevent Ko-fi from retrying on parse errors
    res.status(200).json({ message: 'Processed' });
  }
});

export default router;
