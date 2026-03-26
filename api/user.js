import { supabase } from './db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ── GET /api/user?action=adminData  (admin: fetch all users) ──
    if (req.method === 'GET' && req.query.action === 'adminData') {
      const { data: users, error } = await supabase.from('users').select('*');
      if (error) throw error;
      return res.status(200).json({ users: users || [], txs: [] });
    }

    // ── GET /api/user?email=… ─────────────────────────────────
    if (req.method === 'GET') {
      const { email, refCode } = req.query;
      if (refCode) {
        const { data, error } = await supabase
          .from('users').select('*').eq('refCode', refCode).maybeSingle();
        if (error) throw error;
        return res.status(200).json({ user: data || null });
      }
      if (!email) return res.status(400).json({ error: 'email required' });
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      if (error) throw error;
      return res.status(200).json({ user: data || null });
    }

    // ── POST /api/user?action=adminUpdate  (admin: toggle active) ──
    if (req.method === 'POST' && req.body?.action === 'adminUpdate') {
      const { userId, active } = req.body;
      if (!userId) return res.status(400).json({ error: 'userId required' });
      const { error } = await supabase.from('users').update({ active }).eq('id', userId);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    // ── POST /api/user  (upsert) ──────────────────────────────
    if (req.method === 'POST') {
      const body = req.body;
      if (!body?.email) return res.status(400).json({ error: 'email required' });
      const { _id, ...data } = body;
      const { error } = await supabase
        .from('users')
        .upsert(data, { onConflict: 'id' });
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('user api error:', err);
    return res.status(500).json({ error: err.message });
  }
}
