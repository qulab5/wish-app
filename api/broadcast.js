import { Resend } from 'resend';
import { supabase } from './db.js';

// Optional key — set ADMIN_BROADCAST_KEY in env to restrict access.
function checkAuth(req) {
  const key = process.env.ADMIN_BROADCAST_KEY;
  if (!key) return true;
  return (req.headers['x-admin-key'] || '') === key;
}

// Build audience query from filter criteria
async function fetchRecipients(audience) {
  let query = supabase.from('users').select('id, name, email, country, pts, active');

  const filter = audience?.filter || 'all';
  if (filter === 'active')   query = query.eq('active', true);
  if (filter === 'inactive') query = query.eq('active', false);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch recipients: ${error.message}`);

  let recipients = data || [];

  // Country filter (array of country emoji/codes)
  if (audience?.countries?.length) {
    recipients = recipients.filter(u => audience.countries.includes(u.country));
  }
  // Points range
  if (audience?.minPts != null) recipients = recipients.filter(u => (u.pts || 0) >= audience.minPts);
  if (audience?.maxPts != null) recipients = recipients.filter(u => (u.pts || 0) <= audience.maxPts);

  return recipients;
}

// Wrap message body in a branded email layout
function buildHtml(subject, body, type, appName = 'Wish') {
  const accentMap = {
    info:         '#8b5cf6',
    warning:      '#f59e0b',
    announcement: '#06b6d4',
    promotion:    '#10b981',
  };
  const accent = accentMap[type] || accentMap.info;

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
    <div style="background:linear-gradient(135deg,${accent},${accent}cc);padding:24px 32px;text-align:center;">
      <span style="font-size:28px;">✨</span>
      <div style="color:#fff;font-size:20px;font-weight:800;margin-top:6px;">${appName}</div>
    </div>
    <div style="padding:28px 32px;color:#1a1a2e;line-height:1.7;font-size:15px;">${body}</div>
    <div style="background:#f9f9fb;padding:16px 32px;text-align:center;font-size:12px;color:#999;">
      © ${new Date().getFullYear()} ${appName} · You are receiving this because you have an account with us.
    </div>
  </div>
</body></html>`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  if (!checkAuth(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const { subject, body, type = 'info', channel = 'email', audience, sentBy } = req.body || {};

  if (!subject?.trim()) return res.status(400).json({ success: false, error: 'subject is required' });
  if (!body?.trim())    return res.status(400).json({ success: false, error: 'body is required' });

  try {
    const recipients = await fetchRecipients(audience);

    if (recipients.length === 0) {
      return res.status(200).json({ success: true, sent: 0, failed: 0, total: 0, recipients: [] });
    }

    // In-app channel: no email sending — just return recipients (app would deliver via push/socket)
    if (channel === 'in_app') {
      return res.status(200).json({
        success: true, sent: recipients.length, failed: 0,
        total: recipients.length,
        recipients: recipients.map(u => u.email),
        note: 'In-app delivery recorded. Integrate with your push/socket layer to complete delivery.',
      });
    }

    // Email channel — send via Resend
    const resend    = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    // Free-plan override: Resend only delivers to your verified email on the free tier
    const toOverride = process.env.RESEND_TO_EMAIL;

    const html = buildHtml(subject, body, type);

    let sent = 0, failed = 0;
    const errors = [];

    // Resend free plan: batch isn't available — send one at a time.
    // On a paid plan you can use resend.batch.send([...]) instead.
    for (const user of recipients) {
      try {
        await resend.emails.send({
          from:    fromEmail,
          to:      toOverride || user.email,
          subject: subject,
          html,
        });
        sent++;
      } catch (err) {
        failed++;
        errors.push({ email: user.email, error: err.message });
      }
    }

    return res.status(200).json({
      success: true, sent, failed,
      total: recipients.length,
      recipients: recipients.map(u => u.email),
      errors: errors.slice(0, 10), // cap error list
      note: toOverride ? `Resend free plan: all emails redirected to ${toOverride}` : undefined,
    });
  } catch (err) {
    console.error('Broadcast error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
