// POST /api/airdrop
// Sends 0.01 SOL from the treasury wallet to a new user's wallet.
// Called once after first Google sign-in in the wallet tab.
// The TREASURY_KEY env var must be a JSON array of bytes, e.g. [12,34,...].

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { supabase } from './db.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'POST only' });

  const { address, userId } = req.body ?? {};
  if (!address || !userId) return res.status(400).json({ error: 'address and userId required' });

  // Validate base58 address length
  if (address.length < 32 || address.length > 44) {
    return res.status(400).json({ error: 'Invalid Solana address' });
  }

  try {
    // Check this user exists and hasn't already received an airdrop
    const { data: user } = await supabase
      .from('users')
      .select('id, "airdropDone"')
      .eq('id', userId)
      .maybeSingle();

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.airdropDone) return res.status(200).json({ skipped: true, reason: 'already received' });

    // Load treasury keypair from env
    const rawKey = process.env.TREASURY_KEY;
    if (!rawKey) throw new Error('TREASURY_KEY env var not set');
    const treasury = Keypair.fromSecretKey(new Uint8Array(JSON.parse(rawKey)));

    const conn = new Connection(
      process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
      'confirmed',
    );

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: treasury.publicKey,
        toPubkey:   new PublicKey(address),
        lamports:   10_000_000,   // 0.01 SOL
      }),
    );

    const signature = await sendAndConfirmTransaction(conn, tx, [treasury]);

    // Mark airdrop done so it only happens once
    await supabase
      .from('users')
      .update({ airdropDone: true })
      .eq('id', userId);

    return res.status(200).json({ success: true, signature });
  } catch (e) {
    console.error('[/api/airdrop]', e.message);
    return res.status(500).json({ error: e.message });
  }
}
