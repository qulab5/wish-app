// POST /api/walletSend
// In-app WISH coin transfer: deduct from sender, credit recipient (looked up by walletAddress).
// When WISH_COIN_MINT is deployed on-chain this can be replaced with an SPL transfer.

import { supabase } from './db.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, toAddress, amount } = req.body ?? {};
  if (!userId || !toAddress || !amount) {
    return res.status(400).json({ error: 'userId, toAddress and amount are required' });
  }

  const qty = Number(amount);
  if (!Number.isFinite(qty) || qty <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  try {
    // ── Fetch sender ───────────────────────────────────────────────────────────
    const { data: sender, error: sErr } = await supabase
      .from('users')
      .select('id, tokens')
      .eq('id', userId)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!sender) return res.status(404).json({ error: 'Sender not found' });

    const senderBal = sender.tokens ?? 0;
    if (senderBal < qty) {
      return res.status(400).json({ error: `Insufficient balance (have ${senderBal}, need ${qty})` });
    }

    // ── Fetch recipient by walletAddress ───────────────────────────────────────
    const { data: recipient, error: rErr } = await supabase
      .from('users')
      .select('id, tokens')
      .eq('walletAddress', toAddress.trim())
      .maybeSingle();
    if (rErr) throw rErr;
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient wallet address not found. Make sure the recipient has opened their wallet first.' });
    }
    if (recipient.id === sender.id) {
      return res.status(400).json({ error: 'Cannot send to your own wallet' });
    }

    // ── Deduct from sender ─────────────────────────────────────────────────────
    const { error: deductErr } = await supabase
      .from('users')
      .update({ tokens: senderBal - qty })
      .eq('id', sender.id);
    if (deductErr) throw deductErr;

    // ── Credit recipient ───────────────────────────────────────────────────────
    const recipientBal = recipient.tokens ?? 0;
    const { error: creditErr } = await supabase
      .from('users')
      .update({ tokens: recipientBal + qty })
      .eq('id', recipient.id);
    if (creditErr) {
      // Rollback sender deduction
      await supabase.from('users').update({ tokens: senderBal }).eq('id', sender.id);
      throw creditErr;
    }

    return res.status(200).json({
      success: true,
      newBalance: senderBal - qty,
      signature: `inapp_${Date.now()}`,  // placeholder — replace with tx hash when on-chain
    });
  } catch (e) {
    console.error('[/api/walletSend]', e.message);
    return res.status(500).json({ error: e.message });
  }
}
