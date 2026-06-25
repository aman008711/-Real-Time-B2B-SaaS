import nodemailer from 'nodemailer';
import { env } from '../config/env';

// Cache Ethereal transporter once initialized to prevent recreate delays
let etherealTransporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  // If SMTP is fully configured in the environment, use it
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }

  // Otherwise, use fallback Ethereal test account (cached)
  if (etherealTransporter) {
    return etherealTransporter;
  }

  console.log('🔄 [Mailer] No SMTP credentials provided. Setting up mock Ethereal mail account...');
  const testAccount = await nodemailer.createTestAccount();
  etherealTransporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  return etherealTransporter;
}

export async function sendInviteEmail(
  toEmail: string,
  inviterName: string,
  workspaceName: string
): Promise<void> {
  try {
    const transporter = await getTransporter();

    const mailOptions = {
      from: env.SMTP_FROM,
      to: toEmail,
      subject: `You have been invited to join the ${workspaceName} workspace!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #4f46e5; margin: 0;">SlackNotion</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Real-Time Collaboration Workspace</p>
          </div>
          <div style="padding: 20px; border-radius: 8px; background-color: #f8fafc; margin-bottom: 24px;">
            <p style="font-size: 16px; color: #1e293b; margin-top: 0;">Hello,</p>
            <p style="font-size: 15px; color: #334155; line-height: 1.6;">
              <strong>${inviterName}</strong> has invited you to collaborate in their workspace: <strong>${workspaceName}</strong>.
            </p>
            <p style="font-size: 15px; color: #334155; line-height: 1.6;">
              Log in to your account now to access the new workspace and start collaborating with your team!
            </p>
            <div style="text-align: center; margin-top: 28px; margin-bottom: 12px;">
              <a href="http://localhost:5173" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
                Go to Workspace
              </a>
            </div>
          </div>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 16px;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
            This email was sent dynamically from the SlackNotion invitation portal.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ [Mailer] Invite email successfully sent to: ${toEmail}`);

    // If using Ethereal test account, print Ethereal preview link
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`🔗 [Mailer Preview Link]: ${previewUrl}`);
    }
  } catch (error) {
    console.error('❌ [Mailer] Failed to send invite email:', error);
  }
}
