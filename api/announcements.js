import { supabase } from './db.js';

// Announcements are stored as a JSON array in the `name` column of a
// dedicated system row in the existing `users` table — no migration needed.
const SYS_ID    = 'sys_notifications';
const SYS_EMAIL = 'notifications@sys.internal';

async function readList() {
  const { data, error } = await supabase
    .from('users').select('name').eq('id', SYS_ID).maybeSingle();
  if (error) throw error;
  try { return data?.name ? JSON.parse(data.name) : []; } catch { return []; }
}

async function writeList(list) {
  const { error } = await supabase.from('users').upsert({
    id: SYS_ID, email: SYS_EMAIL,
    name: JSON.stringify(list.slice(0, 100)),
    active: false, pts: 0, usd: 0,
  }, { onConflict: 'id' });
  if (error) throw error;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GET /api/announcements — list all
    if (req.method === 'GET') {
      const list = await readList();
      return res.status(200).json({ announcements: list });
    }

    // POST /api/announcements — add one
    if (req.method === 'POST') {
      const { id, type, title, body, icon, color, sentBy } = req.body || {};
      if (!title?.trim()) return res.status(400).json({ error: 'title required' });
      const existing = await readList();
      const entry = {
        id:     id || `ann_${Date.now()}`,
        type:   type   || 'announcement',
        title:  title.trim(),
        body:   (body || '').trim(),
        icon:   icon  || '📢',
        color:  color || '#06b6d4',
        sentAt: new Date().toISOString(),
        sentBy: sentBy || 'admin',
      };
      await writeList([entry, ...existing]);
      return res.status(200).json({ success: true, announcement: entry });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('announcements error:', err);
    return res.status(500).json({ error: err.message });
  }
}
