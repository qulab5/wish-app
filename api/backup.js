import { supabase } from './db.js';

// Protect with ADMIN_BACKUP_KEY env var.
// If not set, the endpoint still works but logs a warning — set it in production.
function checkAuth(req) {
  const key = process.env.ADMIN_BACKUP_KEY;
  if (!key) return true; // not configured — allow (warn via response meta)
  const header = req.headers['x-admin-key'] || '';
  return header === key;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!checkAuth(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized — provide x-admin-key header' });
  }

  try {
    // Fetch all rows from every table.
    // Add more table names here as the schema grows.
    const tableNames = ['users'];
    const tables = {};

    for (const table of tableNames) {
      const { data, error } = await supabase.from(table).select('*');
      if (error) throw new Error(`Failed to read table "${table}": ${error.message}`);
      tables[table] = { count: data.length, rows: data };
    }

    const payload = {
      version: '1.0',
      app: 'wish-app',
      exportedAt: new Date().toISOString(),
      keyConfigured: !!process.env.ADMIN_BACKUP_KEY,
      tables,
    };

    return res.status(200).json({ success: true, backup: payload });
  } catch (err) {
    console.error('Backup error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
