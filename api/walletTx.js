// GET /api/walletTx?userId=<id>
// Returns the last 20 transactions for a user (sent or received).

import { supabase } from './db.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    // Fetch sent transactions
    const { data: sent, error: sErr } = await supabase
      .from('transactions')
      .select('id, toUserId, toAddress, amount, createdAt')
      .eq('fromUserId', userId)
      .order('createdAt', { ascending: false })
      .limit(20);
    if (sErr) throw sErr;

    // Fetch received transactions
    const { data: received, error: rErr } = await supabase
      .from('transactions')
      .select('id, fromUserId, fromAddress, amount, createdAt')
      .eq('toUserId', userId)
      .order('createdAt', { ascending: false })
      .limit(20);
    if (rErr) throw rErr;

    // Merge and sort by date descending, keep latest 20
    const txs = [
      ...(sent     || []).map(t => ({ ...t, type: 'sent',     address: t.toAddress,   createdAt: t.createdAt })),
      ...(received || []).map(t => ({ ...t, type: 'received', address: t.fromAddress, createdAt: t.createdAt })),
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20);

    return res.status(200).json({ txs });
  } catch (e) {
    console.error('[/api/walletTx]', e.message);
    return res.status(500).json({ error: e.message });
  }
}
