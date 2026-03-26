import { supabase } from './db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, toAddress, amount } = req.body || {};
  if (!userId)    return res.status(400).json({ error: 'userId required' });
  if (!toAddress) return res.status(400).json({ error: 'toAddress required' });
  if (!amount || amount <= 0) return res.status(400).json({ error: 'amount must be positive' });

  try {
    // Fetch sender
    const { data: sender, error: sErr } = await supabase
      .from('users').select('*').eq('id', userId).maybeSingle();
    if (sErr) throw sErr;
    if (!sender) return res.status(404).json({ error: 'Sender not found' });

    const senderBal = sender.tokens ?? 0;
    if (senderBal < amount) return res.status(400).json({ error: 'Insufficient balance' });

    // Fetch recipient by wallet address
    const { data: recipient, error: rErr } = await supabase
      .from('users').select('*').eq('walletAddress', toAddress).maybeSingle();
    if (rErr) throw rErr;
    if (!recipient) return res.status(404).json({ error: 'Recipient wallet not found on this platform' });
    if (recipient.id === userId) return res.status(400).json({ error: 'Cannot send to your own wallet' });

    const newSenderBal    = senderBal - amount;
    const newRecipientBal = (recipient.tokens ?? 0) + amount;

    // Update both balances atomically (best effort — no true DB transaction without RPC)
    const [se, re] = await Promise.all([
      supabase.from('users').update({ tokens: newSenderBal    }).eq('id', userId),
      supabase.from('users').update({ tokens: newRecipientBal }).eq('id', recipient.id),
    ]);
    if (se.error) throw se.error;
    if (re.error) throw re.error;

    // Record transaction history (best-effort — gracefully skip if column missing)
    const now = new Date().toISOString();
    const txId = `tx_${Date.now()}`;
    try {
      const [sd, rd] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).maybeSingle(),
        supabase.from('users').select('*').eq('id', recipient.id).maybeSingle(),
      ]);
      const sTxs = Array.isArray(sd.data?.txHistory) ? sd.data.txHistory : [];
      const rTxs = Array.isArray(rd.data?.txHistory) ? rd.data.txHistory : [];
      await Promise.all([
        supabase.from('users').update({
          txHistory: [
            { id: txId, type: 'sent', address: toAddress, amount, createdAt: now },
            ...sTxs,
          ].slice(0, 50),
        }).eq('id', userId),
        supabase.from('users').update({
          txHistory: [
            { id: txId + '_r', type: 'received', address: sender.walletAddress || '', amount, createdAt: now },
            ...rTxs,
          ].slice(0, 50),
        }).eq('id', recipient.id),
      ]);
    } catch (_) {
      // txHistory column may not exist in DB — non-critical, balance was already updated
    }

    return res.status(200).json({ success: true, newBalance: newSenderBal });
  } catch (err) {
    console.error('[walletSend] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
