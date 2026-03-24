// GET /api/walletBalance?address=<base58>
// Returns SOL balance + WISH token balance for a wallet address.
// Running server-side avoids CORS issues with the public Solana RPC.

import { Connection, PublicKey } from '@solana/web3.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { address } = req.query;
  if (!address) return res.status(400).json({ error: 'address required' });

  try {
    const conn  = new Connection(
      process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
      'confirmed',
    );
    const pk = new PublicKey(address);

    // SOL balance
    const lamports = await conn.getBalance(pk);
    const sol = (lamports / 1e9).toFixed(4);

    // WISH token balance (if mint is configured)
    let wish = 0;
    const mintStr = process.env.WISH_COIN_MINT;
    if (mintStr) {
      try {
        const accts = await conn.getParsedTokenAccountsByOwner(pk, {
          mint: new PublicKey(mintStr),
        });
        wish = accts.value[0]?.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0;
      } catch { /* token account may not exist yet */ }
    }

    return res.json({ sol, wish, mintConfigured: !!mintStr });
  } catch (e) {
    console.error('[/api/walletBalance]', e.message);
    return res.status(500).json({ error: e.message });
  }
}
