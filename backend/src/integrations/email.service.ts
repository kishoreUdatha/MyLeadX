import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';
import { prisma } from '../config/database';
import { MessageDirection, MessageStatus } from '@prisma/client';
import { emailTrackingService } from '../services/email-tracking.service';

interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
  html?: string;
  leadId?: string;
  userId: string;
  campaignId?: string;
  enableTracking?: boolean;
}

interface SendBulkEmailInput {
  recipients: Array<{
    email: string;
    name?: string;
    leadId?: string;
  }>;
  subject: string;
  body: string;
  html?: string;
  userId: string;
}

export class EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }

  async sendEmail(input: SendEmailInput) {
    // Create email log first to get the ID for tracking
    const emailLog = await prisma.emailLog.create({
      data: {
        leadId: input.leadId,
        userId: input.userId,
        campaignId: input.campaignId,
        toEmail: input.to,
        subject: input.subject,
        body: input.body,
        direction: MessageDirection.OUTBOUND,
        status: MessageStatus.PENDING,
      },
    });

    try {
      // Process HTML for tracking if enabled and HTML is provided
      let processedHtml = input.html;
      if (input.enableTracking !== false && input.html) {
        processedHtml = emailTrackingService.processHtmlForTracking(
          input.html,
          emailLog.id,
          input.leadId,
          input.campaignId
        );
      }

      const info = await this.transporter.sendMail({
        from: config.smtp.from,
        to: input.to,
        subject: input.subject,
        text: input.body,
        html: processedHtml,
      });

      // Update email log with sent status
      const updatedLog = await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: MessageStatus.SENT,
          providerMsgId: info.messageId,
          sentAt: new Date(),
        },
      });

      return { success: true, messageId: info.messageId, log: updatedLog };
    } catch (error) {
      // Update email log with failed status
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: MessageStatus.FAILED,
          metadata: { error: (error as Error).message },
        },
      });

      throw error;
    }
  }

  async sendBulkEmail(input: SendBulkEmailInput) {
    const results = [];

    for (const recipient of input.recipients) {
      try {
        // Personalize message
        const personalizedBody = this.personalizeMessage(input.body, recipient);
        const personalizedHtml = input.html
          ? this.personalizeMessage(input.html, recipient)
          : undefined;

        const result = await this.sendEmail({
          to: recipient.email,
          subject: input.subject,
          body: personalizedBody,
          html: personalizedHtml,
          leadId: recipient.leadId,
          userId: input.userId,
        });

        results.push({
          email: recipient.email,
          success: true,
          messageId: result.messageId,
        });
      } catch (error) {
        results.push({
          email: recipient.email,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    return results;
  }

  private personalizeMessage(message: string, recipient: { name?: string; email: string }) {
    return message
      .replace(/{name}/g, recipient.name || 'Student')
      .replace(/{email}/g, recipient.email);
  }

  async sendPasswordResetEmail(email: string, resetToken: string) {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;

    return this.sendEmail({
      to: email,
      subject: 'Password Reset Request',
      body: `You requested a password reset. Click here to reset your password: ${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset. Click the button below to reset your password:</p>
        <p><a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
      userId: 'system',
    });
  }

  async sendWelcomeEmail(user: { email: string; firstName: string }) {
    return this.sendEmail({
      to: user.email,
      subject: 'Welcome to CRM Lead Generation',
      body: `Hi ${user.firstName},\n\nWelcome to CRM Lead Generation! Your account has been created successfully.\n\nGet started by logging in at ${config.frontendUrl}/login\n\nBest regards,\nThe CRM Team`,
      html: `
        <h2>Welcome to CRM Lead Generation!</h2>
        <p>Hi ${user.firstName},</p>
        <p>Your account has been created successfully.</p>
        <p><a href="${config.frontendUrl}/login" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Login Now</a></p>
        <p>Best regards,<br>The CRM Team</p>
      `,
      userId: 'system',
    });
  }

  async sendPaymentConfirmation(
    user: { email: string; firstName: string },
    payment: { amount: number; currency: string; orderId: string }
  ) {
    return this.sendEmail({
      to: user.email,
      subject: 'Payment Confirmation',
      body: `Hi ${user.firstName},\n\nThank you for your payment!\n\nAmount: ${payment.currency} ${payment.amount}\nOrder ID: ${payment.orderId}\n\nBest regards,\nThe CRM Team`,
      html: `
        <h2>Payment Confirmation</h2>
        <p>Hi ${user.firstName},</p>
        <p>Thank you for your payment!</p>
        <table style="border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Amount</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${payment.currency} ${payment.amount}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Order ID</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${payment.orderId}</td>
          </tr>
        </table>
        <p>Best regards,<br>The CRM Team</p>
      `,
      userId: 'system',
    });
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      return { success: true, message: 'Email connection verified' };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}

export const emailService = new EmailService();
