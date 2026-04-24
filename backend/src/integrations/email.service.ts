import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';
import { prisma } from '../config/database';
import { MessageDirection, MessageStatus } from '@prisma/client';
import { emailTrackingService } from '../services/email-tracking.service';
import { emailSettingsService } from '../services/emailSettings.service';
import { resendService } from '../services/resend.service';

interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
  html?: string;
  leadId?: string;
  userId: string;
  organizationId?: string; // For org-specific email settings
  campaignId?: string;
  enableTracking?: boolean;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
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

      // Try to use org-specific email settings first
      if (input.organizationId) {
        try {
          const result = await emailSettingsService.sendEmail(input.organizationId, {
            to: input.to,
            subject: input.subject,
            text: input.body,
            html: processedHtml,
            attachments: input.attachments,
          });

          // Update email log with sent status
          const updatedLog = await prisma.emailLog.update({
            where: { id: emailLog.id },
            data: {
              status: MessageStatus.SENT,
              providerMsgId: result.messageId,
              sentAt: new Date(),
            },
          });

          return { success: true, messageId: result.messageId, log: updatedLog };
        } catch (orgEmailError: any) {
          // If org settings not found or failed, fall back to default
          if (orgEmailError.name === 'NotFoundError' || orgEmailError.message?.includes('not configured')) {
            console.log(`[Email] Org ${input.organizationId} has no email settings, using default`);
          } else {
            throw orgEmailError; // Re-throw if it's a real error
          }
        }
      }

      // Fall back to default transporter
      const info = await this.transporter.sendMail({
        from: config.smtp.from,
        to: input.to,
        subject: input.subject,
        text: input.body,
        html: processedHtml,
        attachments: input.attachments,
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
    const currentYear = new Date().getFullYear();
    const expiryTime = '1 hour';

    const plainTextBody = `
Password Reset Request

We received a request to reset the password for your account associated with ${email}.

Click the link below to reset your password:
${resetUrl}

This link will expire in ${expiryTime} for security reasons.

If you didn't request a password reset, please ignore this email or contact support if you have concerns about your account security.

For security tips:
- Never share your password with anyone
- Use a strong, unique password
- Enable two-factor authentication if available

Best regards,
The MyLeadX Team

---
This is an automated message. Please do not reply directly to this email.
    `.trim();

    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Reset Your Password</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f7fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Main Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden;">

          <!-- Header with Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 50px 40px; text-align: center;">
              <!-- Logo/Icon -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: rgba(255, 255, 255, 0.2); border-radius: 50%; padding: 16px;">
                    <img src="https://img.icons8.com/fluency/48/lock-2.png" alt="Security" width="48" height="48" style="display: block;">
                  </td>
                </tr>
              </table>
              <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 24px 0 8px 0; letter-spacing: -0.5px;">Password Reset</h1>
              <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 0;">Secure your account in just a few clicks</p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 40px;">
              <!-- Greeting -->
              <p style="color: #1a1a2e; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Hello,
              </p>

              <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
                We received a request to reset the password for your account associated with <strong style="color: #667eea;">${email}</strong>.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 32px auto;">
                <tr>
                  <td style="border-radius: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 16px 48px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; letter-spacing: 0.5px;">
                      Reset My Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Timer Notice -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: #fef3c7; border-radius: 12px; margin: 24px 0;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 12px;">
                          <img src="https://img.icons8.com/fluency/24/time.png" alt="Time" width="24" height="24">
                        </td>
                        <td style="vertical-align: middle;">
                          <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 500;">
                            This link will expire in <strong>${expiryTime}</strong> for security reasons.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Alternative Link -->
              <p style="color: #718096; font-size: 13px; line-height: 1.6; margin: 24px 0 0 0;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="background-color: #f7fafc; border-radius: 8px; padding: 12px 16px; margin: 8px 0 24px 0; word-break: break-all;">
                <a href="${resetUrl}" style="color: #667eea; font-size: 13px; text-decoration: none;">${resetUrl}</a>
              </p>

              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">

              <!-- Security Notice -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: #f0fdf4; border-radius: 12px; border-left: 4px solid #22c55e;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: #166534; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">
                      Didn't request this?
                    </p>
                    <p style="color: #15803d; font-size: 13px; line-height: 1.6; margin: 0;">
                      If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged and your account is secure.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Security Tips -->
              <div style="margin-top: 32px;">
                <p style="color: #1a1a2e; font-size: 14px; font-weight: 600; margin: 0 0 16px 0;">
                  Security Tips:
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                  <tr>
                    <td style="padding: 8px 0;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="vertical-align: top; padding-right: 12px;">
                            <span style="color: #667eea; font-size: 16px;">&#10003;</span>
                          </td>
                          <td style="color: #4a5568; font-size: 13px; line-height: 1.5;">
                            Never share your password with anyone
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="vertical-align: top; padding-right: 12px;">
                            <span style="color: #667eea; font-size: 16px;">&#10003;</span>
                          </td>
                          <td style="color: #4a5568; font-size: 13px; line-height: 1.5;">
                            Use a strong, unique password with letters, numbers, and symbols
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="vertical-align: top; padding-right: 12px;">
                            <span style="color: #667eea; font-size: 16px;">&#10003;</span>
                          </td>
                          <td style="color: #4a5568; font-size: 13px; line-height: 1.5;">
                            Enable two-factor authentication for extra security
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 32px 40px; border-top: 1px solid #e2e8f0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                <tr>
                  <td align="center">
                    <p style="color: #64748b; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">
                      MyLeadX
                    </p>
                    <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; margin: 0 0 16px 0;">
                      Smart CRM for Lead Generation & Sales Automation
                    </p>
                    <!-- Social Links -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 16px auto;">
                      <tr>
                        <td style="padding: 0 8px;">
                          <a href="#" style="text-decoration: none;">
                            <img src="https://img.icons8.com/fluency/24/twitter.png" alt="Twitter" width="24" height="24">
                          </a>
                        </td>
                        <td style="padding: 0 8px;">
                          <a href="#" style="text-decoration: none;">
                            <img src="https://img.icons8.com/fluency/24/linkedin.png" alt="LinkedIn" width="24" height="24">
                          </a>
                        </td>
                        <td style="padding: 0 8px;">
                          <a href="#" style="text-decoration: none;">
                            <img src="https://img.icons8.com/fluency/24/facebook-new.png" alt="Facebook" width="24" height="24">
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                      &copy; ${currentYear} MyLeadX. All rights reserved.
                    </p>
                    <p style="color: #cbd5e1; font-size: 11px; margin: 8px 0 0 0;">
                      This is an automated message. Please do not reply directly to this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    // Try Resend first (more reliable), then fallback to SMTP
    if (resendService.isConfigured()) {
      console.log('[Email] Sending password reset via Resend to:', email);
      const result = await resendService.sendEmail({
        to: email,
        subject: 'Reset Your Password - MyLeadX',
        body: plainTextBody,
        html: htmlBody,
      });

      if (result.success) {
        console.log('[Email] Password reset email sent via Resend:', result.messageId);
        return { success: true, messageId: result.messageId };
      } else {
        console.error('[Email] Resend failed, trying SMTP:', result.error);
      }
    }

    // Fallback to SMTP
    console.log('[Email] Sending password reset via SMTP to:', email);
    return this.sendEmail({
      to: email,
      subject: 'Reset Your Password - MyLeadX',
      body: plainTextBody,
      html: htmlBody,
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

  /**
   * Send email using organization's own email settings
   * Falls back to default if org settings not available
   */
  async sendEmailWithOrgSettings(
    organizationId: string,
    options: {
      to: string;
      subject: string;
      text: string;
      html?: string;
      attachments?: Array<{ filename: string; content: string | Buffer; contentType?: string }>;
    }
  ) {
    // Try org-specific settings first
    try {
      return await emailSettingsService.sendEmail(organizationId, options);
    } catch (error: any) {
      // If not configured, use default
      if (error.name === 'NotFoundError' || error.message?.includes('not configured')) {
        const info = await this.transporter.sendMail({
          from: config.smtp.from,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
          attachments: options.attachments,
        });
        return { success: true, messageId: info.messageId };
      }
      throw error;
    }
  }

  /**
   * Generate ICS calendar file content
   */
  generateIcsContent(event: {
    uid: string;
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    location?: string;
    organizerEmail: string;
    organizerName?: string;
    attendeeEmail: string;
    attendeeName?: string;
  }): string {
    const formatIcsDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const escapeIcsText = (text: string): string => {
      return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
    };

    const now = new Date();
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MyLeadX//Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${formatIcsDate(now)}`,
      `DTSTART:${formatIcsDate(event.startTime)}`,
      `DTEND:${formatIcsDate(event.endTime)}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
    ];

    if (event.description) {
      lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
    }

    if (event.location) {
      lines.push(`LOCATION:${escapeIcsText(event.location)}`);
    }

    lines.push(`ORGANIZER;CN=${event.organizerName || 'MyLeadX'}:mailto:${event.organizerEmail}`);
    lines.push(`ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${event.attendeeName || event.attendeeEmail}:mailto:${event.attendeeEmail}`);

    lines.push('STATUS:CONFIRMED');
    lines.push('SEQUENCE:0');
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT60M');
    lines.push('ACTION:EMAIL');
    lines.push(`DESCRIPTION:Reminder: ${escapeIcsText(event.title)}`);
    lines.push('END:VALARM');
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT15M');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:Reminder: ${escapeIcsText(event.title)}`);
    lines.push('END:VALARM');
    lines.push('END:VEVENT');
    lines.push('END:VCALENDAR');

    return lines.join('\r\n');
  }

  /**
   * Send calendar invitation email with ICS attachment
   */
  async sendCalendarInvitation(input: {
    to: string;
    toName?: string;
    eventTitle: string;
    eventDescription?: string;
    startTime: Date;
    endTime: Date;
    location?: string;
    eventId?: string;
  }) {
    const organizerEmail = config.smtp.from || 'noreply@myleadx.ai';
    const uid = input.eventId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@myleadx`;

    // Generate ICS content
    const icsContent = this.generateIcsContent({
      uid,
      title: input.eventTitle,
      description: input.eventDescription,
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location,
      organizerEmail,
      organizerName: 'MyLeadX',
      attendeeEmail: input.to,
      attendeeName: input.toName,
    });

    // Format date for display
    const formatDisplayDate = (date: Date): string => {
      return date.toLocaleString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',
      });
    };

    const startDisplay = formatDisplayDate(input.startTime);
    const endDisplay = formatDisplayDate(input.endTime);

    const subject = `Calendar Invitation: ${input.eventTitle}`;
    const body = `
You have been invited to the following event:

${input.eventTitle}

When: ${startDisplay} - ${endDisplay}
${input.location ? `Where: ${input.location}` : ''}
${input.eventDescription ? `\nDetails:\n${input.eventDescription}` : ''}

Please find the calendar invitation attached. You can add this event to your calendar by opening the attached .ics file.

Best regards,
MyLeadX
    `.trim();

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">Calendar Invitation</h2>
        <h3 style="color: #1f2937;">${input.eventTitle}</h3>

        <table style="margin: 20px 0; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 16px 8px 0; color: #6b7280; font-weight: bold;">When:</td>
            <td style="padding: 8px 0;">${startDisplay}</td>
          </tr>
          <tr>
            <td style="padding: 8px 16px 8px 0; color: #6b7280; font-weight: bold;">Duration:</td>
            <td style="padding: 8px 0;">${Math.round((input.endTime.getTime() - input.startTime.getTime()) / 60000)} minutes</td>
          </tr>
          ${input.location ? `
          <tr>
            <td style="padding: 8px 16px 8px 0; color: #6b7280; font-weight: bold;">Where:</td>
            <td style="padding: 8px 0;">${input.location}</td>
          </tr>
          ` : ''}
        </table>

        ${input.eventDescription ? `
        <div style="margin: 20px 0; padding: 16px; background-color: #f3f4f6; border-radius: 8px;">
          <p style="margin: 0; color: #374151;">${input.eventDescription.replace(/\n/g, '<br>')}</p>
        </div>
        ` : ''}

        <p style="margin-top: 24px; padding: 16px; background-color: #dbeafe; border-radius: 8px; color: #1e40af;">
          <strong>Note:</strong> Please open the attached <code>invite.ics</code> file to add this event to your calendar.
        </p>

        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 14px;">
          This invitation was sent by MyLeadX Voice AI System.
        </p>
      </div>
    `;

    try {
      const info = await this.transporter.sendMail({
        from: config.smtp.from,
        to: input.to,
        subject,
        text: body,
        html,
        attachments: [
          {
            filename: 'invite.ics',
            content: icsContent,
            contentType: 'text/calendar; method=REQUEST',
          },
        ],
        // Set content type for calendar invite
        icalEvent: {
          method: 'REQUEST',
          content: icsContent,
        },
      });

      console.log(`[Email] Calendar invitation sent to ${input.to}, messageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('[Email] Failed to send calendar invitation:', (error as Error).message);
      throw error;
    }
  }
}

export const emailService = new EmailService();
