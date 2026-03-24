// GET /api/wallet?userId=<id>
// Returns the user's Solana wallet address, creating one if it doesn't exist yet.
// The wallet is derived deterministically from userId + TREASURY_KEY so it is
// always recoverable — no extra env vars required.

import { Keypair } from '@solana/web3.js';
import { createHmac } from 'crypto';
import { supabase } from './db.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function deriveKeypair(userId) {
  const seed = createHmac('sha256', process.env.TREASURY_KEY)
    .update('wish_user_wallet_v1:' + userId)
    .digest()
    .slice(0, 32);
  return Keypair.fromSeed(seed);
}

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    // Return existing wallet address if already stored
    const { data: user } = await supabase
      .from('users')
      .select('walletAddress')
      .eq('id', userId)
      .maybeSingle();

    if (user?.walletAddress) {
      return res.json({ address: user.walletAddress });
    }

    // First visit — derive wallet and store the public key
    if (!process.env.TREASURY_KEY) throw new Error('TREASURY_KEY not set');
    const keypair = deriveKeypair(userId);
    const address = keypair.publicKey.toBase58();

    await supabase
      .from('users')
      .update({ walletAddress: address })
      .eq('id', userId);

    // Trigger airdrop in background (fire-and-forget)
    fetch(`${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['host']}/api/airdrop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, userId }),
    }).catch(() => {});

    return res.json({ address });
  } catch (e) {
    console.error('[/api/wallet]', e.message);
    return res.status(500).json({ error: e.message });
  }
}
