import * as brevo from '@getbrevo/brevo';
import crypto from 'crypto';

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// Initialize Brevo API
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY || '');

export const sendVerificationEmail = async (email: string, token: string): Promise<boolean> => {
  const verificationUrl = `${APP_URL}/verify?token=${token}`;

  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = 'Verify your Lang Stall account';
    sendSmtpEmail.htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1e40af;">Welcome to Lang Stall!</h1>
        <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
        <a href="${verificationUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">
          Verify Email
        </a>
        <p style="color: #6b7280; font-size: 14px;">
          Or copy and paste this link in your browser:<br>
          <a href="${verificationUrl}">${verificationUrl}</a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `;
    sendSmtpEmail.sender = {
      name: 'Lang Stall',
      email: process.env.BREVO_SENDER_EMAIL || 'noreply@langstall.tech'
    };
    sendSmtpEmail.to = [{ email }];

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`Verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
};

export const generateVerificationToken = (): string => {
  return crypto.randomUUID();
};
