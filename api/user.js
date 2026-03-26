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

    // ── POST /api/user?action=adminUpdate  (admin: update any user fields) ──
    if (req.method === 'POST' && req.body?.action === 'adminUpdate') {
      const { userId, action: _a, ...fields } = req.body;
      if (!userId) return res.status(400).json({ error: 'userId required' });
      const { error } = await supabase.from('users').update(fields).eq('id', userId);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    // ── POST /api/user?action=adminDelete  (admin: delete a user) ──
    if (req.method === 'POST' && req.body?.action === 'adminDelete') {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: 'userId required' });
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    // ── POST /api/user?action=adminCreate  (admin: create a new user) ──
    if (req.method === 'POST' && req.body?.action === 'adminCreate') {
      const { action: _a, ...data } = req.body;
      if (!data.email) return res.status(400).json({ error: 'email required' });
      if (!data.id) data.id = `u_${Date.now()}`;
      const { error } = await supabase.from('users').insert(data);
      if (error) throw error;
      return res.status(200).json({ success: true, id: data.id });
    }

    // ── POST /api/user  action=uploadAvatar ──────────────────
    if (req.method === 'POST' && req.body?.action === 'uploadAvatar') {
      const { userId, imageData } = req.body;
      if (!userId || !imageData) return res.status(400).json({ error: 'userId and imageData required' });
      const { error } = await supabase.from('users').update({ avatar: imageData }).eq('id', userId);
      if (error) throw error;
      return res.status(200).json({ url: imageData });
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
