import { prisma } from '../config/database';

// ==================== Types ====================

type NotificationTemplateType =
  | 'APPLICATION_SUBMITTED'
  | 'APPLICATION_STATUS_CHANGE'
  | 'DOCUMENT_VERIFIED'
  | 'DOCUMENT_REJECTED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_VERIFIED'
  | 'PAYMENT_REJECTED'
  | 'PAYMENT_LINK_SENT'
  | 'PAYMENT_REMINDER'
  | 'ADMISSION_CONFIRMED'
  | 'COMMISSION_APPROVED'
  | 'PAYOUT_PROCESSED'
  | 'APPLICATION_LINK_SENT'
  | 'COUNSELLOR_ASSIGNED';

interface SendNotificationDto {
  organizationId: string;
  recipientPhone?: string;
  recipientEmail?: string;
  templateType: NotificationTemplateType;
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL';
  variables: Record<string, string>;
  applicationId?: string;
  partnerId?: string;
}

// Default templates
const DEFAULT_TEMPLATES: Record<NotificationTemplateType, { sms: string; whatsapp: string; email: { subject: string; body: string } }> = {
  APPLICATION_SUBMITTED: {
    sms: 'Dear {{studentName}}, your application #{{applicationNumber}} has been submitted. Track: {{trackingUrl}}',
    whatsapp: '*Application Submitted*\n\nDear {{studentName}},\nYour application #{{applicationNumber}} submitted successfully.\n\nTrack: {{trackingUrl}}',
    email: {
      subject: 'Application Submitted - {{applicationNumber}}',
      body: 'Dear {{studentName}},\n\nYour application #{{applicationNumber}} has been submitted.\n\nTrack at: {{trackingUrl}}\n\nRegards,\n{{organizationName}}',
    },
  },
  APPLICATION_STATUS_CHANGE: {
    sms: 'Application #{{applicationNumber}} status: {{status}}. Details: {{trackingUrl}}',
    whatsapp: '*Application Update*\n\nApplication #{{applicationNumber}} status: *{{status}}*\n\nDetails: {{trackingUrl}}',
    email: {
      subject: 'Application Update - {{applicationNumber}}',
      body: 'Dear {{studentName}},\n\nYour application #{{applicationNumber}} status: {{status}}\n\nTrack: {{trackingUrl}}\n\nRegards,\n{{organizationName}}',
    },
  },
  DOCUMENT_VERIFIED: {
    sms: 'Document {{documentName}} for #{{applicationNumber}} verified.',
    whatsapp: '*Document Verified*\n\n{{documentName}} for #{{applicationNumber}} verified.',
    email: {
      subject: 'Document Verified - {{applicationNumber}}',
      body: 'Dear {{studentName}},\n\n{{documentName}} for #{{applicationNumber}} verified.\n\nRegards,\n{{organizationName}}',
    },
  },
  DOCUMENT_REJECTED: {
    sms: 'Document {{documentName}} rejected. Reason: {{reason}}. Please re-upload.',
    whatsapp: '*Document Rejected*\n\n{{documentName}} rejected.\nReason: {{reason}}\n\nPlease re-upload.',
    email: {
      subject: 'Document Rejected - {{applicationNumber}}',
      body: 'Dear {{studentName}},\n\n{{documentName}} rejected. Reason: {{reason}}\n\nPlease re-upload at: {{trackingUrl}}\n\nRegards,\n{{organizationName}}',
    },
  },
  PAYMENT_RECEIVED: {
    sms: 'Payment Rs.{{amount}} received for #{{applicationNumber}}. Verification in progress.',
    whatsapp: '*Payment Received*\n\nRs.{{amount}} received for #{{applicationNumber}}.\nVerification in progress.',
    email: {
      subject: 'Payment Received - {{applicationNumber}}',
      body: 'Dear {{studentName}},\n\nPayment of Rs.{{amount}} received for #{{applicationNumber}}.\n\nRegards,\n{{organizationName}}',
    },
  },
  PAYMENT_VERIFIED: {
    sms: 'Payment Rs.{{amount}} verified for #{{applicationNumber}}. Thank you!',
    whatsapp: '*Payment Verified*\n\nRs.{{amount}} verified for #{{applicationNumber}}. Thank you!',
    email: {
      subject: 'Payment Verified - {{applicationNumber}}',
      body: 'Dear {{studentName}},\n\nPayment of Rs.{{amount}} verified for #{{applicationNumber}}.\n\nRegards,\n{{organizationName}}',
    },
  },
  PAYMENT_REJECTED: {
    sms: 'Payment proof rejected for #{{applicationNumber}}. Reason: {{reason}}',
    whatsapp: '*Payment Rejected*\n\nPayment proof rejected for #{{applicationNumber}}.\nReason: {{reason}}',
    email: {
      subject: 'Payment Rejected - {{applicationNumber}}',
      body: 'Dear {{studentName}},\n\nPayment proof rejected. Reason: {{reason}}\n\nPlease resubmit at: {{trackingUrl}}\n\nRegards,\n{{organizationName}}',
    },
  },
  PAYMENT_LINK_SENT: {
    sms: 'Pay Rs.{{amount}} for #{{applicationNumber}}: {{paymentUrl}}. Valid {{validity}}hrs.',
    whatsapp: '*Payment Link*\n\nPay Rs.{{amount}} for #{{applicationNumber}}\n\nLink: {{paymentUrl}}\nValid: {{validity}} hours',
    email: {
      subject: 'Payment Link - {{applicationNumber}}',
      body: 'Dear {{studentName}},\n\nPay Rs.{{amount}} for #{{applicationNumber}}\n\nLink: {{paymentUrl}}\nValid: {{validity}} hours\n\nRegards,\n{{organizationName}}',
    },
  },
  PAYMENT_REMINDER: {
    sms: 'Reminder: Rs.{{amount}} pending for #{{applicationNumber}}. Pay: {{paymentUrl}}',
    whatsapp: '*Payment Reminder*\n\nRs.{{amount}} pending for #{{applicationNumber}}\n\nPay now: {{paymentUrl}}',
    email: {
      subject: 'Payment Reminder - {{applicationNumber}}',
      body: 'Dear {{studentName}},\n\nRs.{{amount}} pending for #{{applicationNumber}}\n\nPay: {{paymentUrl}}\n\nRegards,\n{{organizationName}}',
    },
  },
  ADMISSION_CONFIRMED: {
    sms: 'Congrats {{studentName}}! Admission #{{applicationNumber}} confirmed. Welcome to {{universityName}}!',
    whatsapp: '*Admission Confirmed!*\n\nCongratulations {{studentName}}!\n\n#{{applicationNumber}} confirmed.\nWelcome to {{universityName}}!',
    email: {
      subject: 'Admission Confirmed - {{applicationNumber}}',
      body: 'Dear {{studentName}},\n\nCongratulations! Admission #{{applicationNumber}} confirmed.\n\nWelcome to {{universityName}}!\n\nRegards,\n{{organizationName}}',
    },
  },
  COMMISSION_APPROVED: {
    sms: 'Commission Rs.{{amount}} approved for #{{applicationNumber}}. Balance: Rs.{{balance}}',
    whatsapp: '*Commission Approved*\n\nRs.{{amount}} approved for #{{applicationNumber}}\nBalance: Rs.{{balance}}',
    email: {
      subject: 'Commission Approved - {{applicationNumber}}',
      body: 'Dear Partner,\n\nCommission Rs.{{amount}} approved for #{{applicationNumber}}\nBalance: Rs.{{balance}}\n\nRegards,\n{{organizationName}}',
    },
  },
  PAYOUT_PROCESSED: {
    sms: 'Payout Rs.{{amount}} processed. Reference: {{referenceId}}',
    whatsapp: '*Payout Processed*\n\nRs.{{amount}} sent.\nReference: {{referenceId}}',
    email: {
      subject: 'Payout Processed - {{referenceId}}',
      body: 'Dear Partner,\n\nPayout Rs.{{amount}} processed.\nReference: {{referenceId}}\n\nRegards,\n{{organizationName}}',
    },
  },
  APPLICATION_LINK_SENT: {
    sms: 'Fill application: {{applicationUrl}}. Shared by {{partnerName}}.',
    whatsapp: '*Application Link*\n\nFill your application:\n{{applicationUrl}}\n\nBy: {{partnerName}}',
    email: {
      subject: 'Complete Your Application',
      body: 'Dear Student,\n\nComplete your application:\n{{applicationUrl}}\n\nShared by {{partnerName}}\n\nRegards,\n{{organizationName}}',
    },
  },
  COUNSELLOR_ASSIGNED: {
    sms: 'Counsellor {{counsellorName}} assigned to #{{applicationNumber}}. Contact: {{counsellorPhone}}',
    whatsapp: '*Counsellor Assigned*\n\n{{counsellorName}} assigned to #{{applicationNumber}}\nContact: {{counsellorPhone}}',
    email: {
      subject: 'Counsellor Assigned - {{applicationNumber}}',
      body: 'Dear {{studentName}},\n\nCounsellor {{counsellorName}} assigned.\nContact: {{counsellorPhone}}\n\nRegards,\n{{organizationName}}',
    },
  },
};

// ==================== Service ====================

class AdmissionNotificationService {
  async sendNotification(data: SendNotificationDto): Promise<void> {
    try {
      const template = DEFAULT_TEMPLATES[data.templateType];
      if (!template) return;

      const organization = await prisma.organization.findUnique({
        where: { id: data.organizationId },
        select: { name: true, brandName: true },
      });

      const variables = {
        ...data.variables,
        organizationName: organization?.brandName || organization?.name || 'Team',
      };

      let message: string;

      switch (data.channel) {
        case 'SMS':
          message = this.replaceVariables(template.sms, variables);
          await this.sendSMS(data.recipientPhone!, message);
          break;
        case 'WHATSAPP':
          message = this.replaceVariables(template.whatsapp, variables);
          await this.sendWhatsApp(data.recipientPhone!, message);
          break;
        case 'EMAIL':
          const subject = this.replaceVariables(template.email.subject, variables);
          message = this.replaceVariables(template.email.body, variables);
          await this.sendEmail(data.recipientEmail!, subject, message);
          break;
      }

      console.log(`[Notification] ${data.channel} sent to ${data.recipientPhone || data.recipientEmail}`);
    } catch (error) {
      console.error('Notification failed:', error);
    }
  }

  private replaceVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
    }
    return result;
  }

  private async sendSMS(phone: string, message: string): Promise<void> {
    // TODO: Integrate with SMS provider
    console.log(`[SMS] To: ${phone}, Message: ${message}`);
  }

  private async sendWhatsApp(phone: string, message: string): Promise<void> {
    // TODO: Integrate with WhatsApp API
    console.log(`[WhatsApp] To: ${phone}, Message: ${message}`);
  }

  private async sendEmail(email: string, subject: string, body: string): Promise<void> {
    // TODO: Integrate with email provider
    console.log(`[Email] To: ${email}, Subject: ${subject}`);
  }

  // ==================== Automated Notifications ====================

  async notifyApplicationSubmitted(applicationId: string): Promise<void> {
    const app = await prisma.partnerApplication.findUnique({ where: { id: applicationId } });
    if (!app) return;

    const trackingUrl = `${process.env.FRONTEND_URL}/track/${app.applicationNumber}`;

    if (app.studentPhone) {
      await this.sendNotification({
        organizationId: app.organizationId,
        recipientPhone: app.studentPhone,
        templateType: 'APPLICATION_SUBMITTED',
        channel: 'WHATSAPP',
        variables: { studentName: app.studentName, applicationNumber: app.applicationNumber, trackingUrl },
        applicationId,
      });
    }
  }

  async notifyStatusChange(applicationId: string, newStatus: string): Promise<void> {
    const app = await prisma.partnerApplication.findUnique({ where: { id: applicationId } });
    if (!app || !app.studentPhone) return;

    const trackingUrl = `${process.env.FRONTEND_URL}/track/${app.applicationNumber}`;
    const status = newStatus.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

    await this.sendNotification({
      organizationId: app.organizationId,
      recipientPhone: app.studentPhone,
      templateType: 'APPLICATION_STATUS_CHANGE',
      channel: 'WHATSAPP',
      variables: { studentName: app.studentName, applicationNumber: app.applicationNumber, status, trackingUrl },
      applicationId,
    });
  }

  async notifyPaymentLinkSent(applicationId: string, paymentUrl: string, amount: number, validityHours: number): Promise<void> {
    const app = await prisma.partnerApplication.findUnique({ where: { id: applicationId } });
    if (!app || !app.studentPhone) return;

    await this.sendNotification({
      organizationId: app.organizationId,
      recipientPhone: app.studentPhone,
      templateType: 'PAYMENT_LINK_SENT',
      channel: 'WHATSAPP',
      variables: {
        studentName: app.studentName,
        applicationNumber: app.applicationNumber,
        amount: amount.toLocaleString('en-IN'),
        paymentUrl,
        validity: validityHours.toString(),
      },
      applicationId,
    });
  }

  async notifyCommissionApproved(partnerId: string, applicationId: string, amount: number): Promise<void> {
    const partner = await prisma.admissionPartner.findUnique({
      where: { id: partnerId },
      include: { wallet: true },
    });
    if (!partner || !partner.phone) return;

    const app = await prisma.partnerApplication.findUnique({ where: { id: applicationId } });
    if (!app) return;

    await this.sendNotification({
      organizationId: partner.organizationId,
      recipientPhone: partner.phone,
      templateType: 'COMMISSION_APPROVED',
      channel: 'WHATSAPP',
      variables: {
        applicationNumber: app.applicationNumber,
        amount: amount.toLocaleString('en-IN'),
        balance: Number(partner.wallet?.balance || 0).toLocaleString('en-IN'),
      },
      applicationId,
      partnerId,
    });
  }

  async notifyAdmissionConfirmed(applicationId: string): Promise<void> {
    const app = await prisma.partnerApplication.findUnique({
      where: { id: applicationId },
      include: { university: { select: { name: true } } },
    });
    if (!app || !app.studentPhone) return;

    await this.sendNotification({
      organizationId: app.organizationId,
      recipientPhone: app.studentPhone,
      templateType: 'ADMISSION_CONFIRMED',
      channel: 'WHATSAPP',
      variables: {
        studentName: app.studentName,
        applicationNumber: app.applicationNumber,
        universityName: app.university?.name || 'the university',
      },
      applicationId,
    });
  }

  async sendPaymentReminders(): Promise<void> {
    const expiringLinks = await prisma.applicationPaymentLink.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { gte: new Date(), lte: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      },
      include: { application: true },
    });

    for (const link of expiringLinks) {
      if (!link.application.studentPhone) continue;

      const paymentUrl = `${process.env.FRONTEND_URL}/pay/${link.token}`;

      await this.sendNotification({
        organizationId: link.application.organizationId,
        recipientPhone: link.application.studentPhone,
        templateType: 'PAYMENT_REMINDER',
        channel: 'WHATSAPP',
        variables: {
          studentName: link.application.studentName,
          applicationNumber: link.application.applicationNumber,
          amount: Number(link.amount).toLocaleString('en-IN'),
          paymentUrl,
        },
        applicationId: link.applicationId,
      });
    }
  }
}

export const admissionNotificationService = new AdmissionNotificationService();
