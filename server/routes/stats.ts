import { Router, Request, Response } from 'express';
import pool from '../db.js';

const router = Router();

// Get current month's start date
const getCurrentMonthStart = (): string => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return monthStart.toISOString().split('T')[0];
};

// Public endpoint: Get sustainability stats (no auth required)
router.get('/', async (req: Request, res: Response) => {
  try {
    const monthStart = getCurrentMonthStart();

    // Get current month's API costs
    const costsResult = await pool.query(
      'SELECT cost_usd, request_count FROM api_costs WHERE month = $1',
      [monthStart]
    );

    const costs = costsResult.rows[0]?.cost_usd || 0;
    const requestCount = costsResult.rows[0]?.request_count || 0;

    // Ko-fi URL from environment variable (set in Railway)
    const kofiUrl = process.env.KOFI_URL || null;

    res.json({
      month: monthStart,
      costs: parseFloat(costs.toString()),
      requestCount,
      kofiUrl,
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
