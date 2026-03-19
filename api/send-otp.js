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

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    console.log('Sending OTP to email:', email);
    console.log('OTP generated:', otp);

    // Send email using Resend - ALL OTPs go to YOUR email
    const { data, error } = await resend.emails.send({
      from: 'Wish App <onboarding@resend.dev>',
      to: 'abbasqulab735@gmail.com', // Hardcoded to YOUR email
      subject: '🔐 Wish App Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; background: #0d0b1e; padding: 30px; border-radius: 20px;">
          <h1 style="color: #8b5cf6; text-align: center;">✨ Wish App</h1>
          <p style="color: white; text-align: center;">Someone requested a code for: <strong>${email}</strong></p>
          <div style="background: #13102a; padding: 20px; border-radius: 10px; text-align: center; border: 1px solid #8b5cf6;">
            <p style="color: #a78bfa; font-size: 14px;">Your verification code is:</p>
            <h2 style="color: #8b5cf6; font-size: 48px; letter-spacing: 5px;">${otp}</h2>
            <p style="color: #f59e0b;">⏰ Expires in 5 minutes</p>
          </div>
        </div>
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    console.log('Email sent successfully:', data);
    
    // Email sent successfully
    return res.status(200).json({ 
      success: true,
      message: 'OTP sent'
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
