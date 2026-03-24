// POST /api/mine
// Sends Wish Coin tokens from the treasury ATA to the user's ATA.
// Required env vars:
//   TREASURY_KEY     – JSON byte-array of treasury keypair (e.g. [12,34,...])
//   WISH_COIN_MINT   – base58 mint address of your Wish Coin token
//   SOLANA_RPC       – (optional) RPC URL; defaults to mainnet-beta public RPC

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { supabase } from './db.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// How many Wish Coins to mint per call (with 9 decimals → 100 WISH)
const MINE_AMOUNT = 100n * 1_000_000_000n;

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'POST only' });

  const { address, userId } = req.body ?? {};
  if (!address || !userId) return res.status(400).json({ error: 'address and userId required' });

  // Validate env vars early
  const rawKey  = process.env.TREASURY_KEY;
  const mintStr = process.env.WISH_COIN_MINT;
  if (!rawKey)  return res.status(500).json({ error: 'TREASURY_KEY env var not set' });
  if (!mintStr) return res.status(500).json({ error: 'WISH_COIN_MINT env var not set' });

  try {
    // Verify this user owns this wallet address
    const { data: user } = await supabase
      .from('users')
      .select('id, "walletAddress"')
      .eq('id', userId)
      .maybeSingle();

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.walletAddress !== address) {
      return res.status(403).json({ error: 'Wallet address does not match user' });
    }

    const treasury = Keypair.fromSecretKey(new Uint8Array(JSON.parse(rawKey)));
    const conn     = new Connection(
      process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
      'confirmed',
    );
    const mintPk   = new PublicKey(mintStr);
    const userPk   = new PublicKey(address);

    // Get or create ATAs for treasury and user (treasury pays for any new ATA)
    const [treasuryAta, userAta] = await Promise.all([
      getOrCreateAssociatedTokenAccount(conn, treasury, mintPk, treasury.publicKey),
      getOrCreateAssociatedTokenAccount(conn, treasury, mintPk, userPk),
    ]);

    const tx = new Transaction().add(
      createTransferInstruction(
        treasuryAta.address,
        userAta.address,
        treasury.publicKey,
        MINE_AMOUNT,
        [],
        TOKEN_PROGRAM_ID,
      ),
    );

    const signature = await sendAndConfirmTransaction(conn, tx, [treasury]);

    return res.status(200).json({ success: true, signature });
  } catch (e) {
    console.error('[/api/mine]', e.message);
    return res.status(500).json({ error: e.message });
  }
}
