import crypto from 'crypto';
import { Resend } from 'resend';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }

  try {
    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Sign the token to prevent tampering
    const secret = process.env.OTP_SECRET || 'wish-app-otp-secret-change-in-production';
    const payload = `${email}|${otp}|${expiry}`;
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const token = Buffer.from(`${payload}|${signature}`).toString('base64');

    // Send email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Free plan: can only deliver to your own verified email
    const toEmail = process.env.RESEND_TO_EMAIL || email;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: `Your Wish App verification code: ${otp}`,
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px">
          <h2 style="color:#8b5cf6">Your verification code</h2>
          <p>Use this code to verify your account${toEmail !== email ? ` (requested for ${email})` : ''}:</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#8b5cf6;padding:16px 0">${otp}</div>
          <p style="color:#666;font-size:14px">This code expires in 10 minutes.</p>
        </div>
      `
    });

    return res.status(200).json({ success: true, token });
  } catch (err) {
    console.error('Send OTP error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to send code' });
  }
}
