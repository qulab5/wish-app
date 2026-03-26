import { supabase } from './db.js';

function checkAuth(req) {
  const key = process.env.ADMIN_BACKUP_KEY;
  if (!key) return true;
  return (req.headers['x-admin-key'] || '') === key;
}

// Tables we allow restoring, mapped to their upsert conflict key.
const ALLOWED_TABLES = {
  users: 'id',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!checkAuth(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized — provide x-admin-key header' });
  }

  const { backup, strategy = 'upsert' } = req.body || {};

  if (!backup || typeof backup !== 'object') {
    return res.status(400).json({ success: false, error: 'Request body must include a backup object' });
  }
  if (backup.app !== 'wish-app') {
    return res.status(400).json({ success: false, error: 'Backup is not from wish-app' });
  }
  if (!backup.version || !backup.tables) {
    return res.status(400).json({ success: false, error: 'Invalid backup format — missing version or tables' });
  }

  const results = {};
  const errors  = [];

  try {
    for (const [table, conflictKey] of Object.entries(ALLOWED_TABLES)) {
      const tableData = backup.tables[table];
      if (!tableData) { results[table] = { skipped: true, reason: 'not in backup' }; continue; }

      const rows = tableData.rows || [];
      if (rows.length === 0) { results[table] = { restored: 0 }; continue; }

      if (strategy === 'skip') {
        // Insert only rows that don't already exist
        const { data: existing } = await supabase.from(table).select(conflictKey);
        const existingIds = new Set((existing || []).map(r => r[conflictKey]));
        const newRows = rows.filter(r => !existingIds.has(r[conflictKey]));
        if (newRows.length > 0) {
          const { error } = await supabase.from(table).insert(newRows);
          if (error) throw new Error(`Insert into "${table}" failed: ${error.message}`);
        }
        results[table] = { restored: newRows.length, skipped: rows.length - newRows.length };
      } else {
        // Default: upsert (overwrite on conflict)
        const { error } = await supabase.from(table).upsert(rows, { onConflict: conflictKey });
        if (error) throw new Error(`Upsert into "${table}" failed: ${error.message}`);
        results[table] = { restored: rows.length };
      }
    }

    return res.status(200).json({
      success: true,
      restoredAt: new Date().toISOString(),
      strategy,
      results,
      errors,
    });
  } catch (err) {
    console.error('Restore error:', err);
    return res.status(500).json({ success: false, error: err.message, results, errors });
  }
}
