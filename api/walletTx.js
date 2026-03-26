import { supabase } from './db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    // select('*') avoids column-not-found errors for optional fields like txHistory
    const { data: user, error } = await supabase
      .from('users').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;

    const txs = Array.isArray(user?.txHistory) ? user.txHistory : [];
    return res.status(200).json({ txs });
  } catch (err) {
    // Return empty gracefully — don't break the wallet UI over missing history
    console.error('[walletTx] error:', err.message);
    return res.status(200).json({ txs: [] });
  }
}
