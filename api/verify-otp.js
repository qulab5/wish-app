import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { token, otp } = req.body || {};

  if (!token || !otp) {
    return res.status(400).json({ success: false, error: 'Token and OTP are required' });
  }

  try {
    // Decode the token created by send-otp.js
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split('|');

    if (parts.length !== 4) {
      return res.status(400).json({ success: false, error: 'Invalid token format' });
    }

    const [email, storedOtp, expiry, signature] = parts;

    // 1. Check expiry
    if (Date.now() > parseInt(expiry, 10)) {
      return res.status(400).json({ success: false, error: 'Code has expired. Please request a new one.' });
    }

    // 2. Verify HMAC signature (prevents tampering)
    const secret = process.env.OTP_SECRET || 'wish-app-otp-secret-change-in-production';
    const payload = `${email}|${storedOtp}|${expiry}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return res.status(400).json({ success: false, error: 'Invalid token' });
    }

    // 3. Check OTP matches
    if (otp.trim() !== storedOtp) {
      return res.status(400).json({ success: false, error: 'Incorrect code. Please try again.' });
    }

    return res.status(200).json({ success: true, email });
  } catch (err) {
    console.error('Verify error:', err);
    return res.status(400).json({ success: false, error: 'Verification failed' });
  }
}
