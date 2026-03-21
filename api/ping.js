import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return res.status(500).json({
      ok: false,
      error: 'Missing env vars',
      SUPABASE_URL: url ? 'SET' : 'MISSING',
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'SET' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
    });
  }

  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) throw error;
    return res.status(200).json({ ok: true, SUPABASE_URL: 'SET', SUPABASE_SERVICE_KEY: 'SET', rowsFound: data.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
