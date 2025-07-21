import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends an email using Resend
 * @param {Object} options - email options
 * @param {string} options.to - recipient email
 * @param {string} options.subject - subject line
 * @param {string} options.html - HTML body
 */

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const data = await resend.emails.send({
      from: 'onboarding@resend.dev', // or verified Resend domain
      to,
      subject,
      html,
    });

    console.log('Email sent:', data.id || data);
    return data;
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send email');
  }
};
