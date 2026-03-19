import { Resend } from 'resend';
import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { email } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Valid email is required' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ success: false, error: 'Email service not configured. Set RESEND_API_KEY in Vercel environment variables.' });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

  // Create a signed token (stateless — no database needed)
  // Token encodes: email | otp | expiry | hmac-signature
  const secret = process.env.OTP_SECRET || 'wish-app-otp-secret-change-in-production';
  const payload = `${email}|${otp}|${expiry}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const token = Buffer.from(`${payload}|${signature}`).toString('base64');

  // Send email via Resend
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      // Use 'onboarding@resend.dev' for Resend free tier (no custom domain needed).
      // On free tier, 'to' must be YOUR verified Resend account email.
      // For production with a verified domain, change 'from' to: 'noreply@yourdomain.com'
      from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
      to: [email],
      subject: '✨ Your Wish App Verification Code',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d0b1e;color:#fff;border-radius:16px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="font-size:48px;">✨</div>
            <h1 style="color:#a78bfa;font-size:28px;margin:8px 0;">Wish App</h1>
          </div>
          <p style="color:rgba(255,255,255,0.7);margin-bottom:16px;">Your email verification code is:</p>
          <div style="background:linear-gradient(135deg,#8b5cf6,#6d28d9);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
            <span style="font-size:48px;font-weight:900;letter-spacing:12px;font-family:monospace;">${otp}</span>
          </div>
          <p style="color:rgba(255,255,255,0.5);font-size:13px;text-align:center;">
            This code expires in <strong style="color:#f59e0b;">10 minutes</strong>.<br/>
            If you did not request this, ignore this email.
          </p>
        </div>
      `,
    });

    return res.status(200).json({ success: true, token });
  } catch (err) {
    console.error('Resend error:', JSON.stringify(err, null, 2));
    const message = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
    return res.status(500).json({ success: false, error: `Failed to send email: ${message}` });
  }
}
