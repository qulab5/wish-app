import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await resend.emails.send({
      from: 'Wish App <onboarding@resend.dev>',
      to: 'abbasqulab735@gmail.com',
      subject: 'Your Wish App Code',
      html: `<h2>Code: <strong>${otp}</strong></h2><p>For: ${email}</p>`
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
