import { supabase } from './db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ── GET /api/user?email=… ─────────────────────────────────
    if (req.method === 'GET') {
      const { email } = req.query;
      if (!email) return res.status(400).json({ error: 'email required' });
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      if (error) throw error;
      return res.status(200).json({ user: data || null });
    }

    // ── POST /api/user  (save / create) ──────────────────────
    if (req.method === 'POST') {
      const body = req.body;
      if (!body?.email) return res.status(400).json({ error: 'email required' });
      const { _id, id, ...fields } = body;

      // UPDATE by email — never try to overwrite the id column itself,
      // which would fail if the DB uses uuid/bigint while the client
      // sends a string like "u1732...".
      const { data: updated, error: updErr } = await supabase
        .from('users')
        .update(fields)
        .eq('email', fields.email)
        .select('email');
      if (updErr) throw updErr;

      // No existing row (brand-new registration) → INSERT with the client id.
      if (!updated || updated.length === 0) {
        const { error: insErr } = await supabase
          .from('users')
          .insert(id ? { id, ...fields } : fields);
        if (insErr) throw insErr;
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('user api error:', err);
    return res.status(500).json({ error: err.message });
  }
}
