import { supabase } from './db.js';

// Generate a deterministic Solana-format address (base58, 44 chars) from a seed string
function generateAddress(seed) {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let n = 0;
  for (const c of seed) n = (Math.imul(n, 31) + c.charCodeAt(0)) | 0;
  n = Math.abs(n) || 1;
  const addr = [];
  for (let i = 0; i < 44; i++) {
    addr.push(chars[n % chars.length]);
    n = ((Math.imul(n, 1664525) + 1013904223) >>> 0) + i;
  }
  return addr.join('');
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
    const { data: user, error } = await supabase
      .from('users').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Already has a wallet — return it
    if (user.walletAddress) return res.status(200).json({ address: user.walletAddress });

    // Generate a deterministic address and save it
    const address = generateAddress(`${userId}_wish_${user.email || ''}`);
    const { error: updErr } = await supabase.from('users')
      .update({ walletAddress: address }).eq('id', userId);
    if (updErr) throw updErr;

    return res.status(200).json({ address });
  } catch (err) {
    console.error('[wallet] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
