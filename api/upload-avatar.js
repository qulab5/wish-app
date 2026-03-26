import { supabase } from './db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, imageData } = req.body || {};
  if (!userId || !imageData) return res.status(400).json({ error: 'userId and imageData required' });

  try {
    const { error } = await supabase
      .from('users')
      .update({ avatar: imageData })
      .eq('id', userId);
    if (error) throw error;
    return res.status(200).json({ url: imageData });
  } catch (err) {
    console.error('[upload-avatar]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
