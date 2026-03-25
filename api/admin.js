// GET /api/admin?action=data
// Returns all users + recent transactions for the admin panel.
// No auth token needed — admin-only access is enforced on the client side.

import { supabase } from './db.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;

  try {
    if (action === 'data') {
      // Fetch all users
      const { data: users, error: uErr } = await supabase
        .from('users')
        .select('id, name, email, pts, usd, tokens, active, joined, walletAddress, refCode')
        .order('pts', { ascending: false });
      if (uErr) throw uErr;

      // Fetch recent 50 transactions
      const { data: txs, error: tErr } = await supabase
        .from('transactions')
        .select('id, fromUserId, toUserId, fromAddress, toAddress, amount, createdAt')
        .order('createdAt', { ascending: false })
        .limit(50);
      if (tErr) throw tErr;

      return res.status(200).json({ users: users || [], txs: txs || [] });
    }

    // POST: update a user's active status or tokens
    if (req.method === 'POST') {
      const { userId, active, tokens } = req.body ?? {};
      if (!userId) return res.status(400).json({ error: 'userId required' });
      const update = {};
      if (active !== undefined) update.active = active;
      if (tokens !== undefined) update.tokens = tokens;
      const { error } = await supabase.from('users').update(update).eq('id', userId);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    console.error('[/api/admin]', e.message);
    return res.status(500).json({ error: e.message });
  }
}
