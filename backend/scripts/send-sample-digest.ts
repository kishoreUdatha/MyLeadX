/**
 * One-shot: send the Daily Manager Digest sample to a real inbox via Resend.
 * Uses the same mock DigestData as scripts/sample-digest-html.ts.
 *
 * Run:
 *   npx ts-node --transpile-only backend/scripts/send-sample-digest.ts udathak@gmail.com
 */

import 'dotenv/config';
import {
  dailyManagerDigestService,
  type DigestData,
} from '../src/services/daily-manager-digest.service';
import { resendService } from '../src/services/resend.service';

const recipient = process.argv[2];
if (!recipient || !recipient.includes('@')) {
  console.error('Usage: ts-node send-sample-digest.ts <email-address>');
  process.exit(1);
}

const reportDate = new Date('2026-05-13T00:00:00+05:30');

const mock: DigestData = {
  organizationId: 'org_demo',
  organizationName: 'Acme EdTech Pvt. Ltd.',
  reportDate,
  reportDateLabel: 'Wednesday, 13 May 2026',
  generatedAt: new Date('2026-05-14T09:00:00+05:30'),
  totals: {
    totalCalls: 312,
    callsConnected: 198,
    connectRatePct: (198 / 312) * 100,
    newLeads: 87,
    interested: 41,
    converted: 6,
    lostOrNotInterested: 33,
    followUpsCompleted: 54,
    overdueFollowUps: 12,
  },
  totalsPrior: {
    totalCalls: 274,
    callsConnected: 162,
    connectRatePct: (162 / 274) * 100,
    newLeads: 71,
    interested: 38,
    converted: 4,
    lostOrNotInterested: 41,
    followUpsCompleted: 47,
    overdueFollowUps: 9,
  },
  managerRows: [
    { managerId: 'm1', managerName: 'Priya Sharma',  branchName: 'Hyderabad — Banjara Hills', teamSize: 6, calls: 124, connected: 82, connectRatePct: (82 / 124) * 100, interested: 18, converted: 3 },
    { managerId: 'm2', managerName: 'Rahul Verma',   branchName: 'Bengaluru — Indiranagar',   teamSize: 5, calls: 98,  connected: 61, connectRatePct: (61 / 98) * 100,  interested: 14, converted: 2 },
    { managerId: 'm3', managerName: 'Anjali Mehta',  branchName: 'Pune — Koregaon Park',      teamSize: 4, calls: 70,  connected: 41, connectRatePct: (41 / 70) * 100,  interested: 7,  converted: 1 },
    { managerId: 'm4', managerName: 'Suresh Iyer',   branchName: 'Chennai — Velachery',       teamSize: 3, calls: 20,  connected: 14, connectRatePct: (14 / 20) * 100,  interested: 2,  converted: 0 },
  ],
  topPerformers: [
    { userId: 'u1', userName: 'Kavya Reddy',    managerName: 'Priya Sharma', branchName: 'Hyderabad', calls: 38, connected: 27, interested: 7, converted: 2 },
    { userId: 'u2', userName: 'Arjun Nair',     managerName: 'Rahul Verma',  branchName: 'Bengaluru', calls: 34, connected: 23, interested: 5, converted: 2 },
    { userId: 'u3', userName: 'Sneha Patil',    managerName: 'Priya Sharma', branchName: 'Hyderabad', calls: 31, connected: 19, interested: 4, converted: 1 },
    { userId: 'u4', userName: 'Vikram Rao',     managerName: 'Anjali Mehta', branchName: 'Pune',      calls: 29, connected: 17, interested: 3, converted: 1 },
    { userId: 'u5', userName: 'Divya Krishnan', managerName: 'Rahul Verma',  branchName: 'Bengaluru', calls: 28, connected: 16, interested: 4, converted: 0 },
  ],
  bottomPerformers: [
    { userId: 'u6', userName: 'Manoj Kumar', managerName: 'Suresh Iyer',  branchName: 'Chennai', calls: 4, connected: 2, interested: 0, converted: 0 },
    { userId: 'u7', userName: 'Pooja Singh', managerName: 'Suresh Iyer',  branchName: 'Chennai', calls: 7, connected: 5, interested: 1, converted: 0 },
    { userId: 'u8', userName: 'Rohit Desai', managerName: 'Anjali Mehta', branchName: 'Pune',    calls: 9, connected: 6, interested: 1, converted: 0 },
  ],
  conversions: [
    { leadId: 'l1', leadName: 'Aman Gupta',     phone: '+91 98xxxxxx12', source: 'meta',     stageName: 'Won', value: 75000,  closedByName: 'Kavya Reddy', managerName: 'Priya Sharma' },
    { leadId: 'l2', leadName: 'Ritika Bansal',  phone: '+91 90xxxxxx44', source: 'google',   stageName: 'Won', value: 50000,  closedByName: 'Kavya Reddy', managerName: 'Priya Sharma' },
    { leadId: 'l3', leadName: 'Mohit Joshi',    phone: '+91 97xxxxxx08', source: 'website',  stageName: 'Won', value: 120000, closedByName: 'Arjun Nair',  managerName: 'Rahul Verma' },
    { leadId: 'l4', leadName: 'Neha Kulkarni',  phone: '+91 99xxxxxx33', source: 'referral', stageName: 'Won', value: 45000,  closedByName: 'Arjun Nair',  managerName: 'Rahul Verma' },
    { leadId: 'l5', leadName: 'Karthik Suresh', phone: '+91 95xxxxxx21', source: 'meta',     stageName: 'Won', value: 60000,  closedByName: 'Sneha Patil', managerName: 'Priya Sharma' },
    { leadId: 'l6', leadName: 'Ananya Roy',     phone: '+91 96xxxxxx77', source: 'google',   stageName: 'Won', value: 90000,  closedByName: 'Vikram Rao',  managerName: 'Anjali Mehta' },
  ],
  interestedLeads: [
    { leadId: 'i1',  leadName: 'Sandeep Pillai',  phone: '+91 98xxxxxx01', source: 'meta',     telecallerName: 'Kavya Reddy',    managerName: 'Priya Sharma', nextFollowUpAt: new Date('2026-05-15T11:00:00+05:30') },
    { leadId: 'i2',  leadName: 'Meera Iyer',      phone: '+91 99xxxxxx02', source: 'google',   telecallerName: 'Arjun Nair',     managerName: 'Rahul Verma',  nextFollowUpAt: new Date('2026-05-14T15:30:00+05:30') },
    { leadId: 'i3',  leadName: 'Tanmay Shah',     phone: '+91 91xxxxxx03', source: 'website',  telecallerName: 'Sneha Patil',    managerName: 'Priya Sharma', nextFollowUpAt: new Date('2026-05-16T10:00:00+05:30') },
    { leadId: 'i4',  leadName: 'Ishita Khanna',   phone: '+91 92xxxxxx04', source: 'referral', telecallerName: 'Vikram Rao',     managerName: 'Anjali Mehta', nextFollowUpAt: null },
    { leadId: 'i5',  leadName: 'Yash Malhotra',   phone: '+91 93xxxxxx05', source: 'meta',     telecallerName: 'Divya Krishnan', managerName: 'Rahul Verma',  nextFollowUpAt: new Date('2026-05-15T14:00:00+05:30') },
    { leadId: 'i6',  leadName: 'Riya Chaturvedi', phone: '+91 94xxxxxx06', source: 'google',   telecallerName: 'Kavya Reddy',    managerName: 'Priya Sharma', nextFollowUpAt: new Date('2026-05-14T17:00:00+05:30') },
    { leadId: 'i7',  leadName: 'Aditya Bhat',     phone: '+91 95xxxxxx07', source: 'meta',     telecallerName: 'Arjun Nair',     managerName: 'Rahul Verma',  nextFollowUpAt: new Date('2026-05-17T09:30:00+05:30') },
    { leadId: 'i8',  leadName: 'Shruti Menon',    phone: '+91 96xxxxxx08', source: 'website',  telecallerName: 'Sneha Patil',    managerName: 'Priya Sharma', nextFollowUpAt: null },
    { leadId: 'i9',  leadName: 'Harsh Vardhan',   phone: '+91 97xxxxxx09', source: 'referral', telecallerName: 'Vikram Rao',     managerName: 'Anjali Mehta', nextFollowUpAt: new Date('2026-05-18T11:00:00+05:30') },
    { leadId: 'i10', leadName: 'Pallavi Saxena',  phone: '+91 98xxxxxx10', source: 'meta',     telecallerName: 'Divya Krishnan', managerName: 'Rahul Verma',  nextFollowUpAt: new Date('2026-05-15T16:00:00+05:30') },
    { leadId: 'i11', leadName: 'Nikhil Agarwal',  phone: '+91 99xxxxxx11', source: 'google',   telecallerName: 'Kavya Reddy',    managerName: 'Priya Sharma', nextFollowUpAt: new Date('2026-05-14T18:30:00+05:30') },
    { leadId: 'i12', leadName: 'Bhavana Rajan',   phone: '+91 90xxxxxx12', source: 'website',  telecallerName: 'Arjun Nair',     managerName: 'Rahul Verma',  nextFollowUpAt: null },
  ],
  revenueAdded: 440000,
};

async function main() {
  if (!resendService.isConfigured()) {
    console.error('Resend is not configured. Check RESEND_API_KEY in backend/.env');
    process.exit(1);
  }

  const html = dailyManagerDigestService.renderHtml(mock);
  const xlsx = await dailyManagerDigestService.generateExcel(mock);

  console.log(`Sending sample digest to ${recipient}...`);
  console.log(`  HTML: ${html.length} bytes`);
  console.log(`  XLSX: ${xlsx.buffer.length} bytes (${xlsx.filename})`);

  const result = await resendService.sendEmail({
    to: recipient,
    subject: `[SAMPLE] Daily Manager Digest — ${mock.reportDateLabel}`,
    body: `Your scheduled Daily Manager Digest is attached. (This is sample data — Acme EdTech.)`,
    html,
    attachments: [
      {
        filename: xlsx.filename,
        content: xlsx.buffer,
        contentType: xlsx.contentType,
      },
    ],
  });

  if (result.success) {
    console.log(`✓ Sent. Resend messageId: ${result.messageId}`);
  } else {
    console.error(`✗ Send failed: ${result.error}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
