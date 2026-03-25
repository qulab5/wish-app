import { supabase } from './db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ── GET /api/user?action=adminData  (all users + recent txs) ─
    if (req.method === 'GET' && req.query.action === 'adminData') {
      const { data: users, error: uErr } = await supabase
        .from('users')
        .select('*')
        .order('pts', { ascending: false });
      if (uErr) throw uErr;

      const { data: txs, error: tErr } = await supabase
        .from('transactions')
        .select('*')
        .order('createdAt', { ascending: false })
        .limit(50);
      if (tErr) throw tErr;

      return res.status(200).json({ users: users || [], txs: txs || [] });
    }

    // ── GET /api/user?email=… or ?refCode=… ───────────────────
    if (req.method === 'GET') {
      const { email, refCode } = req.query;
      if (!email && !refCode) return res.status(400).json({ error: 'email or refCode required' });
      const field = email ? 'email' : 'refCode';
      const value = email || refCode;
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq(field, value)
        .maybeSingle();
      if (error) throw error;
      return res.status(200).json({ user: data || null });
    }

    // ── POST /api/user?action=adminUpdate  (admin: update any user fields) ──
    if (req.method === 'POST' && req.query.action === 'adminUpdate') {
      const { userId, ...fields } = req.body ?? {};
      if (!userId) return res.status(400).json({ error: 'userId required' });
      const allowed = ['active', 'tokens', 'pts', 'usd', 'name', 'pass', 'isAdmin', 'phone'];
      const update  = {};
      for (const k of allowed) {
        if (fields[k] !== undefined) update[k] = fields[k];
      }
      if (!Object.keys(update).length) return res.status(400).json({ error: 'nothing to update' });
      const { error } = await supabase.from('users').update(update).eq('id', userId);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    // ── POST /api/user  (create or update) ───────────────────
    if (req.method === 'POST') {
      const body = req.body;
      if (!body?.email) return res.status(400).json({ error: 'email required' });

      // Strip any client-only _id key; keep everything else the client sent.
      const { _id, ...data } = body;

      // ── Step 1: look up the existing row by email ─────────
      // We use SELECT rather than ON CONFLICT so we never depend on a
      // UNIQUE constraint existing on the email column.
      const { data: existing, error: selErr } = await supabase
        .from('users')
        .select('id')
        .eq('email', data.email)
        .maybeSingle();
      if (selErr) throw selErr;

      if (existing) {
        // ── Step 2a: row exists — UPDATE by primary key ──────
        // Strip `id` from the payload so we never try to overwrite the PK.
        const { id: _clientId, ...fields } = data;

        const { error: updErr } = await supabase
          .from('users')
          .update(fields)
          .eq('id', existing.id);

        if (updErr) {
          // Full update failed (e.g. a column in `fields` doesn't exist yet).
          // Fall back to a minimal update that only touches pts + usd — these
          // columns exist in every version of the schema.
          console.error('[api/user] full update failed, using minimal fallback:', updErr.message);
          const safe = {};
          if (fields.pts  !== undefined) safe.pts  = fields.pts;
          if (fields.usd  !== undefined) safe.usd  = fields.usd;
          if (fields.name !== undefined) safe.name = fields.name;
          if (Object.keys(safe).length) {
            const { error: minErr } = await supabase
              .from('users')
              .update(safe)
              .eq('id', existing.id);
            if (minErr) throw new Error(`full:${updErr.message} minimal:${minErr.message}`);
          } else {
            throw updErr;
          }
        }
      } else {
        // ── Step 2b: new user — INSERT ─────────────────────────
        const { error: insErr } = await supabase.from('users').insert(data);
        if (insErr) throw insErr;
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[api/user] error:', err.message, err);
    return res.status(500).json({ error: err.message });
  }
}
