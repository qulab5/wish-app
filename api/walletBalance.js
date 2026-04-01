import { supabase } from './db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { address } = req.query;
  if (!address) return res.status(400).json({ error: 'address required' });

  try {
    // select('*') avoids errors if optional columns don't exist
    const { data: user, error } = await supabase
      .from('users').select('*').eq('walletAddress', address).maybeSingle();
    if (error) throw error;

    return res.status(200).json({
      sol:            0,                  // on-chain SOL — not connected to Solana RPC
      wish:           user?.tokens ?? 0,  // WISH balance from DB
      mintConfigured: false,              // false = frontend uses DB tokens field
    });
  } catch (err) {
    console.error('[walletBalance] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
