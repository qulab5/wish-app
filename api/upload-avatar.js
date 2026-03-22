import { supabase } from './db.js';

// Allow up to 5 MB bodies (images are resized client-side to ~50 KB, but keep headroom)
export const config = { api: { bodyParser: { sizeLimit: '5mb' } } };

const BUCKET = 'avatars';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId, imageData, mimeType = 'image/jpeg' } = req.body || {};
    if (!userId || !imageData) {
      return res.status(400).json({ error: 'userId and imageData are required' });
    }

    // Ensure the avatars bucket exists and is publicly readable.
    // createBucket is idempotent — we just ignore "already exists" errors.
    const { error: bucketErr } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      allowedMimeTypes: ['image/*'],
      fileSizeLimit: 5 * 1024 * 1024,
    });
    if (bucketErr && !bucketErr.message.toLowerCase().includes('already exist')) {
      throw bucketErr;
    }

    // Strip the data-URL prefix and decode to a Buffer
    const base64 = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    const ext = (mimeType.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const path = `${userId}/avatar.${ext}`;

    // Upload — upsert:true overwrites the previous avatar automatically
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: mimeType, upsert: true });

    if (uploadErr) throw uploadErr;

    // Retrieve the permanent public URL and append a cache-buster so browsers
    // immediately show the new photo instead of serving a stale cached version.
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);

    return res.status(200).json({ url: `${publicUrl}?v=${Date.now()}` });
  } catch (err) {
    console.error('upload-avatar error:', err);
    return res.status(500).json({ error: err.message });
  }
}
