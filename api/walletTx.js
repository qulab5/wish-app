import { supabase } from './db.js';

async function readTxs(userId) {
  const { data } = await supabase
    .from('users').select('name').eq('id', `txhist_${userId}`).maybeSingle();
  try { return data?.name ? JSON.parse(data.name) : []; } catch { return []; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    const txs = await readTxs(userId);
    return res.status(200).json({ txs });
  } catch (err) {
    console.error('[walletTx] error:', err.message);
    return res.status(200).json({ txs: [] });
  }
}
