/**
 * Sender ID Request Notification Service
 * Sends email notifications for Sender ID request workflow
 */

import { resendService } from './resend.service';
import { prisma } from '../config/database';

interface SenderIdRequestData {
  id: string;
  requestedSenderId: string;
  businessName: string;
  businessType?: string | null;
  purpose?: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  hasOwnDlt: boolean;
  dltEntityId?: string | null;
  dltPlatform?: string | null;
  organizationId: string;
  status: string;
  statusReason?: string | null;
  assignedSenderId?: string | null;
}

interface OrganizationData {
  id: string;
  name: string;
  slug?: string | null;
}

class SenderIdNotificationService {
  private adminEmails: string[];

  constructor() {
    // Admin emails can be configured via environment variable
    const adminEmailsEnv = process.env.SENDER_ID_ADMIN_EMAILS || process.env.ADMIN_EMAIL || '';
    this.adminEmails = adminEmailsEnv.split(',').map(e => e.trim()).filter(Boolean);

    // Fallback admin email
    if (this.adminEmails.length === 0) {
      this.adminEmails = ['admin@myleadx.ai'];
    }
  }

  /**
   * Send notification to admin when a new Sender ID request is submitted
   */
  async notifyAdminOnNewRequest(
    request: SenderIdRequestData,
    organization: OrganizationData
  ): Promise<{ success: boolean; error?: string }> {
    if (!resendService.isConfigured()) {
      console.warn('[SenderIdNotification] Email service not configured, skipping notification');
      return { success: false, error: 'Email service not configured' };
    }

    const subject = `New Sender ID Request: ${request.requestedSenderId} from ${organization.name}`;

    const body = `
A new Sender ID request has been submitted and requires your review.

REQUEST DETAILS
---------------
Requested Sender ID: ${request.requestedSenderId}
Organization: ${organization.name}
Business Name: ${request.businessName}
Business Type: ${request.businessType || 'Not specified'}
Purpose: ${request.purpose || 'Not specified'}

CONTACT INFORMATION
-------------------
Contact Name: ${request.contactName}
Contact Email: ${request.contactEmail}
Contact Phone: ${request.contactPhone || 'Not provided'}

DLT INFORMATION
---------------
Has Own DLT: ${request.hasOwnDlt ? 'Yes' : 'No (Will use Platform DLT)'}
${request.hasOwnDlt ? `DLT Entity ID: ${request.dltEntityId || 'Not provided'}` : ''}
${request.hasOwnDlt ? `DLT Platform: ${request.dltPlatform || 'Not specified'}` : ''}

ACTION REQUIRED
---------------
Please review this request in the Super Admin panel:
1. Verify the business details
2. Register the Sender ID on the DLT portal (if using Platform DLT)
3. Approve or reject the request

Request ID: ${request.id}

---
This is an automated notification from MyLeadX Messaging Portal.
    `.trim();

    const html = this.generateAdminNotificationHtml(request, organization);

    // Send to all admin emails
    const results = await Promise.all(
      this.adminEmails.map(email =>
        resendService.sendEmail({
          to: email,
          subject,
          body,
          html,
        })
      )
    );

    const allSuccessful = results.every(r => r.success);
    if (!allSuccessful) {
      console.error('[SenderIdNotification] Some admin notifications failed:', results);
    }

    return {
      success: allSuccessful,
      error: allSuccessful ? undefined : 'Some notifications failed to send'
    };
  }

  /**
   * Send notification to customer when their Sender ID request is approved
   */
  async notifyCustomerOnApproval(
    request: SenderIdRequestData,
    organization: OrganizationData
  ): Promise<{ success: boolean; error?: string }> {
    if (!resendService.isConfigured()) {
      console.warn('[SenderIdNotification] Email service not configured, skipping notification');
      return { success: false, error: 'Email service not configured' };
    }

    const subject = `Your Sender ID Request Has Been Approved - ${request.assignedSenderId}`;

    const body = `
Dear ${request.contactName},

Great news! Your Sender ID request has been approved.

APPROVAL DETAILS
----------------
Requested Sender ID: ${request.requestedSenderId}
Assigned Sender ID: ${request.assignedSenderId}
Organization: ${organization.name}
Business Name: ${request.businessName}

NEXT STEPS
----------
1. Your SMS service is now active
2. You can start sending messages using your new Sender ID
3. Log in to the Messaging Portal to send your first message
4. Make sure your message templates are DLT compliant

${request.hasOwnDlt ? `
DLT CONFIGURATION
-----------------
Since you have your own DLT registration:
- PE ID: ${request.dltEntityId}
- Platform: ${request.dltPlatform}
- Make sure your templates are registered on your DLT portal
` : `
PLATFORM DLT
------------
You are using MyLeadX Platform DLT:
- We have registered your Sender ID under our PE ID
- Use the pre-approved templates from the Templates section
- Contact support if you need custom templates
`}

If you have any questions, please contact our support team.

Best regards,
MyLeadX Team

---
This is an automated notification from MyLeadX Messaging Portal.
    `.trim();

    const html = this.generateApprovalHtml(request, organization);

    const result = await resendService.sendEmail({
      to: request.contactEmail,
      subject,
      body,
      html,
    });

    if (!result.success) {
      console.error('[SenderIdNotification] Failed to send approval notification:', result.error);
    }

    return result;
  }

  /**
   * Send notification to customer when their Sender ID request is rejected
   */
  async notifyCustomerOnRejection(
    request: SenderIdRequestData,
    organization: OrganizationData,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!resendService.isConfigured()) {
      console.warn('[SenderIdNotification] Email service not configured, skipping notification');
      return { success: false, error: 'Email service not configured' };
    }

    const subject = `Your Sender ID Request Update - Action Required`;

    const body = `
Dear ${request.contactName},

We have reviewed your Sender ID request and unfortunately, we are unable to approve it at this time.

REQUEST DETAILS
---------------
Requested Sender ID: ${request.requestedSenderId}
Organization: ${organization.name}
Business Name: ${request.businessName}

REJECTION REASON
----------------
${reason}

WHAT YOU CAN DO
---------------
1. Review the rejection reason above
2. Address any issues mentioned
3. Submit a new Sender ID request with the updated information
4. Contact our support team if you have questions

Common reasons for rejection:
- Sender ID already in use
- Sender ID doesn't meet format requirements (6 uppercase letters)
- Business verification issues
- DLT compliance concerns

If you believe this rejection was made in error, please contact our support team.

Best regards,
MyLeadX Team

---
This is an automated notification from MyLeadX Messaging Portal.
    `.trim();

    const html = this.generateRejectionHtml(request, organization, reason);

    const result = await resendService.sendEmail({
      to: request.contactEmail,
      subject,
      body,
      html,
    });

    if (!result.success) {
      console.error('[SenderIdNotification] Failed to send rejection notification:', result.error);
    }

    return result;
  }

  /**
   * Send notification when request status changes to "Reviewing"
   */
  async notifyCustomerOnReview(
    request: SenderIdRequestData,
    organization: OrganizationData
  ): Promise<{ success: boolean; error?: string }> {
    if (!resendService.isConfigured()) {
      return { success: false, error: 'Email service not configured' };
    }

    const subject = `Your Sender ID Request is Being Reviewed`;

    const body = `
Dear ${request.contactName},

Your Sender ID request is now being reviewed by our team.

REQUEST DETAILS
---------------
Requested Sender ID: ${request.requestedSenderId}
Organization: ${organization.name}
Business Name: ${request.businessName}

WHAT HAPPENS NEXT
-----------------
1. Our team will verify your business details
2. We will register your Sender ID on the DLT portal (if applicable)
3. You will receive another email once your request is approved or if we need more information

This process typically takes 1-3 business days.

If you have any questions, please contact our support team.

Best regards,
MyLeadX Team
    `.trim();

    const result = await resendService.sendEmail({
      to: request.contactEmail,
      subject,
      body,
    });

    return result;
  }

  /**
   * Generate HTML email for admin notification
   */
  private generateAdminNotificationHtml(
    request: SenderIdRequestData,
    organization: OrganizationData
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 24px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px;">New Sender ID Request</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">

              <!-- Alert Badge -->
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="display: inline-block; background: #fef3c7; color: #92400e; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">
                  Action Required
                </span>
              </div>

              <!-- Request Details -->
              <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 16px;">Request Details</h3>
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; width: 40%;">Requested Sender ID:</td>
                    <td style="padding: 6px 0; color: #1e293b; font-weight: 600;">${request.requestedSenderId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Organization:</td>
                    <td style="padding: 6px 0; color: #1e293b;">${organization.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Business Name:</td>
                    <td style="padding: 6px 0; color: #1e293b;">${request.businessName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Business Type:</td>
                    <td style="padding: 6px 0; color: #1e293b;">${request.businessType || 'Not specified'}</td>
                  </tr>
                </table>
              </div>

              <!-- Contact Info -->
              <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 16px;">Contact Information</h3>
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; width: 40%;">Name:</td>
                    <td style="padding: 6px 0; color: #1e293b;">${request.contactName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Email:</td>
                    <td style="padding: 6px 0; color: #1e293b;">${request.contactEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Phone:</td>
                    <td style="padding: 6px 0; color: #1e293b;">${request.contactPhone || 'Not provided'}</td>
                  </tr>
                </table>
              </div>

              <!-- DLT Info -->
              <div style="background: ${request.hasOwnDlt ? '#ecfdf5' : '#eff6ff'}; border-radius: 8px; padding: 20px; margin-bottom: 20px; border-left: 4px solid ${request.hasOwnDlt ? '#10b981' : '#3b82f6'};">
                <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 16px;">DLT Configuration</h3>
                <p style="margin: 0; color: ${request.hasOwnDlt ? '#065f46' : '#1e40af'}; font-size: 14px;">
                  ${request.hasOwnDlt
                    ? `<strong>Custom DLT</strong> - Customer has their own registration<br>
                       PE ID: ${request.dltEntityId || 'Not provided'}<br>
                       Platform: ${request.dltPlatform || 'Not specified'}`
                    : `<strong>Platform DLT</strong> - Will use MyLeadX PE ID<br>
                       You need to register this Sender ID on the DLT portal.`
                  }
                </p>
              </div>

              <!-- Action -->
              <div style="text-align: center; margin-top: 24px;">
                <p style="color: #64748b; font-size: 13px; margin-bottom: 8px;">Request ID: ${request.id}</p>
                <p style="color: #64748b; font-size: 13px;">Please review this request in the Super Admin panel.</p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                MyLeadX Messaging Portal - Automated Notification
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Generate HTML email for approval notification
   */
  private generateApprovalHtml(
    request: SenderIdRequestData,
    organization: OrganizationData
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px;">Request Approved!</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">

              <!-- Success Icon -->
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: #ecfdf5; border-radius: 50%; margin: 0 auto; line-height: 64px; font-size: 32px;">
                  ✓
                </div>
              </div>

              <p style="text-align: center; color: #1e293b; font-size: 16px; margin-bottom: 24px;">
                Dear ${request.contactName},<br>
                Your Sender ID request has been approved!
              </p>

              <!-- Sender ID Display -->
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; background: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 16px 32px;">
                  <p style="margin: 0 0 4px 0; color: #64748b; font-size: 12px;">Your Sender ID</p>
                  <p style="margin: 0; color: #059669; font-size: 28px; font-weight: 700; letter-spacing: 4px;">${request.assignedSenderId}</p>
                </div>
              </div>

              <!-- Details -->
              <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; width: 40%;">Organization:</td>
                    <td style="padding: 6px 0; color: #1e293b;">${organization.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Business Name:</td>
                    <td style="padding: 6px 0; color: #1e293b;">${request.businessName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">DLT Type:</td>
                    <td style="padding: 6px 0; color: #1e293b;">${request.hasOwnDlt ? 'Custom DLT' : 'Platform DLT'}</td>
                  </tr>
                </table>
              </div>

              <!-- Next Steps -->
              <div style="background: #eff6ff; border-radius: 8px; padding: 20px; border-left: 4px solid #3b82f6;">
                <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 16px;">Next Steps</h3>
                <ol style="margin: 0; padding-left: 20px; color: #1e293b; font-size: 14px; line-height: 1.8;">
                  <li>Your SMS service is now active</li>
                  <li>Log in to the Messaging Portal</li>
                  <li>Set up your message templates</li>
                  <li>Start sending messages!</li>
                </ol>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">
                Questions? Contact our support team.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                MyLeadX Messaging Portal
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Generate HTML email for rejection notification
   */
  private generateRejectionHtml(
    request: SenderIdRequestData,
    organization: OrganizationData,
    reason: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 24px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px;">Request Update</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">

              <p style="color: #1e293b; font-size: 16px; margin-bottom: 24px;">
                Dear ${request.contactName},
              </p>

              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                We have reviewed your Sender ID request for <strong>"${request.requestedSenderId}"</strong>
                and unfortunately, we are unable to approve it at this time.
              </p>

              <!-- Reason -->
              <div style="background: #fef2f2; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #ef4444;">
                <h3 style="margin: 0 0 8px 0; color: #991b1b; font-size: 14px;">Reason for Rejection</h3>
                <p style="margin: 0; color: #7f1d1d; font-size: 14px; line-height: 1.6;">${reason}</p>
              </div>

              <!-- Request Details -->
              <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 16px;">Request Details</h3>
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; width: 40%;">Requested Sender ID:</td>
                    <td style="padding: 6px 0; color: #1e293b;">${request.requestedSenderId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Organization:</td>
                    <td style="padding: 6px 0; color: #1e293b;">${organization.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Business Name:</td>
                    <td style="padding: 6px 0; color: #1e293b;">${request.businessName}</td>
                  </tr>
                </table>
              </div>

              <!-- What to do -->
              <div style="background: #eff6ff; border-radius: 8px; padding: 20px; border-left: 4px solid #3b82f6;">
                <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 16px;">What You Can Do</h3>
                <ol style="margin: 0; padding-left: 20px; color: #1e293b; font-size: 14px; line-height: 1.8;">
                  <li>Review the rejection reason above</li>
                  <li>Address any issues mentioned</li>
                  <li>Submit a new request with updated information</li>
                  <li>Contact support if you have questions</li>
                </ol>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">
                Questions? Contact our support team.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                MyLeadX Messaging Portal
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
}

export const senderIdNotificationService = new SenderIdNotificationService();
