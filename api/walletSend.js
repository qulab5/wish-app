import { supabase } from './db.js';

// Store each user's tx history in a dedicated system row: id = "txhist_{userId}"
// The transactions JSON array is stored in the `name` column (same trick as announcements).
const TXS_EMAIL = 'txhistory@sys.internal';

async function readTxs(userId) {
  const { data } = await supabase
    .from('users').select('name').eq('id', `txhist_${userId}`).maybeSingle();
  try { return data?.name ? JSON.parse(data.name) : []; } catch { return []; }
}

async function writeTxs(userId, txs) {
  await supabase.from('users').upsert({
    id:     `txhist_${userId}`,
    email:  `txhist_${userId}@${TXS_EMAIL}`,
    name:   JSON.stringify(txs.slice(0, 100)),
    active: false, pts: 0, usd: 0,
  }, { onConflict: 'id' });
}

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

    // Update both token balances
    const [se, re] = await Promise.all([
      supabase.from('users').update({ tokens: newSenderBal    }).eq('id', userId),
      supabase.from('users').update({ tokens: newRecipientBal }).eq('id', recipient.id),
    ]);
    if (se.error) throw se.error;
    if (re.error) throw re.error;

    // Record in system-row transaction history for both users
    const now  = new Date().toISOString();
    const txId = `tx_${Date.now()}`;
    const [sTxs, rTxs] = await Promise.all([readTxs(userId), readTxs(recipient.id)]);
    await Promise.all([
      writeTxs(userId, [
        { id: txId, type: 'sent', address: toAddress, amount, createdAt: now },
        ...sTxs,
      ]),
      writeTxs(recipient.id, [
        { id: txId + '_r', type: 'received', address: sender.walletAddress || '', amount, createdAt: now },
        ...rTxs,
      ]),
    ]);

    return res.status(200).json({ success: true, newBalance: newSenderBal });
  } catch (err) {
    console.error('[walletSend] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
