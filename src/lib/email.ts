// Email service using Resend (https://resend.com)
// Free tier: 100 emails/day, 3,000 emails/month

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.APP_URL}/api/auth/verify-email?token=${token}`;
  
  // If RESEND_API_KEY is not set, log to console (development mode)
  if (!process.env.RESEND_API_KEY) {
    console.log('📧 Email Verification Link (Development Mode):');
    console.log(verificationUrl);
    console.log('Copy this link to verify the email address');
    return { success: true, devMode: true };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'QuizMate <onboarding@resend.dev>', // Change this to your verified domain
        to: email,
        subject: 'Verify your QuizMate account',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Verify Your Email</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F172A;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0F172A; padding: 40px 20px;">
                <tr>
                  <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%); border-radius: 24px; border: 2px solid rgba(79, 70, 229, 0.3); overflow: hidden;">
                      <!-- Header -->
                      <tr>
                        <td style="padding: 40px 40px 20px; text-align: center;">
                          <div style="width: 64px; height: 64px; margin: 0 auto 20px; background: linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center;">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                          </div>
                          <h1 style="color: #FFFFFF; font-size: 32px; font-weight: 700; margin: 0 0 12px;">Welcome to QuizMate!</h1>
                          <p style="color: #9CA3AF; font-size: 16px; margin: 0;">Please verify your email address to get started</p>
                        </td>
                      </tr>
                      
                      <!-- Content -->
                      <tr>
                        <td style="padding: 20px 40px 40px;">
                          <div style="background: rgba(15, 23, 42, 0.6); border-radius: 16px; padding: 32px; border: 2px solid rgba(79, 70, 229, 0.2);">
                            <p style="color: #D1D5DB; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                              Thank you for signing up! To complete your registration and start creating amazing quizzes, please verify your email address by clicking the button below:
                            </p>
                            
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td align="center" style="padding: 20px 0;">
                                  <a href="${verificationUrl}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%); color: #FFFFFF; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 10px 30px rgba(79, 70, 229, 0.3);">
                                    Verify Email Address
                                  </a>
                                </td>
                              </tr>
                            </table>
                            
                            <p style="color: #9CA3AF; font-size: 14px; line-height: 1.6; margin: 24px 0 0; padding-top: 24px; border-top: 1px solid rgba(79, 70, 229, 0.2);">
                              If the button doesn't work, copy and paste this link into your browser:<br>
                              <a href="${verificationUrl}" style="color: #34D399; word-break: break-all;">${verificationUrl}</a>
                            </p>
                            
                            <p style="color: #6B7280; font-size: 12px; margin: 16px 0 0;">
                              This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
                            </p>
                          </div>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="padding: 0 40px 40px; text-align: center;">
                          <p style="color: #6B7280; font-size: 12px; margin: 0;">
                            © ${new Date().getFullYear()} QuizMate. All rights reserved.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Resend API error:', error);
      throw new Error('Failed to send email');
    }

    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
}
