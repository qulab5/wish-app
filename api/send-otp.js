import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
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

    // Send email using Resend - ALL OTPs go to YOUR email (abbasqulab735@gmail.com)
    const { data, error } = await resend.emails.send({
      from: 'Wish App <onboarding@resend.dev>',
      to: 'abbasqulab735@gmail.com', // Hardcoded to YOUR email - ALL OTPs come here
      subject: '🔐 Wish App Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Verification Code</title>
          <style>
            body {
              font-family: 'Plus Jakarta Sans', Arial, sans-serif;
              background: #0d0b1e;
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 400px;
              margin: 0 auto;
              background: linear-gradient(135deg, #13102a, #0d0b1e);
              border-radius: 24px;
              padding: 32px;
              border: 1px solid rgba(139,92,246,0.3);
              box-shadow: 0 20px 60px rgba(139,92,246,0.2);
            }
            h1 {
              color: #8b5cf6;
              font-size: 28px;
              text-align: center;
              margin-bottom: 10px;
            }
            .subtitle {
              color: rgba(255,255,255,0.6);
              text-align: center;
              font-size: 14px;
              margin-bottom: 25px;
            }
            .code-box {
              background: rgba(139,92,246,0.1);
              border-radius: 16px;
              padding: 25px;
              text-align: center;
              border: 1px solid rgba(139,92,246,0.2);
            }
            .otp {
              font-size: 48px;
              font-weight: 800;
              color: #8b5cf6;
              letter-spacing: 8px;
              font-family: 'DM Mono', monospace;
              margin: 20px 0;
              padding: 15px;
              background: rgba(0,0,0,0.3);
              border-radius: 12px;
            }
            .info {
              background: rgba(245,158,11,0.08);
              border: 1px solid rgba(245,158,11,0.2);
              border-radius: 12px;
              padding: 15px;
              margin: 20px 0;
              color: #f59e0b;
              font-size: 14px;
            }
            .footer {
              text-align: center;
              color: rgba(255,255,255,0.3);
              font-size: 12px;
              margin-top: 25px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✨ Wish App</h1>
            <div class="subtitle">Verification Code</div>
            
            <div class="code-box">
              <div style="color: rgba(255,255,255,0.7); font-size: 14px; margin-bottom: 5px;">
                Someone requested a code for:
              </div>
              <div style="color: #a78bfa; font-weight: 600; font-size: 16px; margin-bottom: 15px;">
                ${email}
              </div>
              
              <div class="otp">${otp}</div>
              
              <div class="info">
                ⏰ This code expires in 5 minutes
              </div>
            </div>
            
            <div class="footer">
              If you didn't request this code, please ignore this email.<br>
              © 2025 Wish App. All rights reserved.
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to send email. Please try again.' 
      });
    }

    // Email sent successfully
    return res.status(200).json({ 
      success: true,
      message: 'OTP sent to your registered email'
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error. Please try again.' 
    });
  }
}
