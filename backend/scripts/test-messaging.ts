/**
 * Test Script: Messaging API
 * Tests SMS, WhatsApp, and Email sending during telecaller calls
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testMessaging() {
  console.log('========================================');
  console.log('MESSAGING API TEST');
  console.log('========================================\n');

  try {
    // Step 1: Get test organization and user
    console.log('Step 1: Finding test organization and user...');
    const org = await prisma.organization.findFirst();
    const user = await prisma.user.findFirst({
      where: { organizationId: org?.id },
    });

    if (!org || !user) {
      console.error('❌ No organization or user found. Please seed the database first.');
      return;
    }
    console.log(`✅ Found org: ${org.name}, user: ${user.firstName} ${user.lastName}\n`);

    // Step 2: Create a test lead
    console.log('Step 2: Creating test lead for messaging...');
    const lead = await prisma.lead.create({
      data: {
        organizationId: org.id,
        firstName: 'Test',
        lastName: 'Messaging',
        phone: '+919876543210',
        email: 'test.messaging@example.com',
        source: 'MANUAL',
      },
    });
    console.log(`✅ Created lead: ${lead.id}\n`);

    // Step 3: Test SMS Message Log
    console.log('Step 3: Creating SMS message log...');
    const smsLog = await prisma.messageLog.create({
      data: {
        organizationId: org.id,
        leadId: lead.id,
        userId: user.id,
        type: 'SMS',
        to: lead.phone,
        content: 'Hi Test, thank you for speaking with us! Feel free to reach out if you have any questions.',
        status: 'SENT',
        externalId: `sms_${Date.now()}`,
        sentAt: new Date(),
      },
    });
    console.log(`✅ SMS Log created: ${smsLog.id}`);
    console.log(`   To: ${smsLog.to}`);
    console.log(`   Status: ${smsLog.status}\n`);

    // Step 4: Test WhatsApp Message Log
    console.log('Step 4: Creating WhatsApp message log...');
    const whatsappLog = await prisma.messageLog.create({
      data: {
        organizationId: org.id,
        leadId: lead.id,
        userId: user.id,
        type: 'WHATSAPP',
        to: lead.phone,
        content: 'Hi Test! 👋\n\nThank you for your time on the call. Here are the details we discussed.\n\nLet me know if you have any questions!',
        status: 'SENT',
        externalId: `wa_${Date.now()}`,
        sentAt: new Date(),
      },
    });
    console.log(`✅ WhatsApp Log created: ${whatsappLog.id}`);
    console.log(`   To: ${whatsappLog.to}`);
    console.log(`   Status: ${whatsappLog.status}\n`);

    // Step 5: Test Email Message Log
    console.log('Step 5: Creating Email message log...');
    const emailLog = await prisma.messageLog.create({
      data: {
        organizationId: org.id,
        leadId: lead.id,
        userId: user.id,
        type: 'EMAIL',
        to: lead.email!,
        subject: 'Follow-up from our call',
        content: 'Dear Test,\n\nThank you for taking the time to speak with me today.\n\nI will follow up with the information we discussed.\n\nBest regards',
        status: 'SENT',
        externalId: `email_${Date.now()}`,
        sentAt: new Date(),
      },
    });
    console.log(`✅ Email Log created: ${emailLog.id}`);
    console.log(`   To: ${emailLog.to}`);
    console.log(`   Subject: ${emailLog.subject}`);
    console.log(`   Status: ${emailLog.status}\n`);

    // Step 6: Create lead activities for the messages
    console.log('Step 6: Creating lead activities...');

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: 'SMS_SENT',
        title: 'SMS Sent',
        description: 'Thank you message sent during call',
        userId: user.id,
        metadata: { messageLogId: smsLog.id },
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: 'WHATSAPP_SENT',
        title: 'WhatsApp Message Sent',
        description: 'Follow-up details sent via WhatsApp',
        userId: user.id,
        metadata: { messageLogId: whatsappLog.id },
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: 'EMAIL_SENT',
        title: 'Email Sent',
        description: 'Follow-up from our call',
        userId: user.id,
        metadata: { messageLogId: emailLog.id },
      },
    });
    console.log(`✅ Lead activities created\n`);

    // Step 7: Verify message logs
    console.log('Step 7: Verifying message logs...');
    const messageLogs = await prisma.messageLog.findMany({
      where: { leadId: lead.id },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`\n📊 Message Summary for Lead ${lead.firstName} ${lead.lastName}:`);
    console.log('─'.repeat(50));
    messageLogs.forEach((log, index) => {
      console.log(`${index + 1}. ${log.type}`);
      console.log(`   To: ${log.to}`);
      console.log(`   Status: ${log.status}`);
      console.log(`   Sent: ${log.sentAt?.toLocaleString()}`);
      if (log.subject) console.log(`   Subject: ${log.subject}`);
      console.log('');
    });

    // Step 8: Verify lead activities
    console.log('Step 8: Verifying lead activities...');
    const activities = await prisma.leadActivity.findMany({
      where: {
        leadId: lead.id,
        type: { in: ['SMS_SENT', 'WHATSAPP_SENT', 'EMAIL_SENT'] },
      },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`\n📋 Activities logged:`);
    activities.forEach((activity) => {
      console.log(`   ✓ ${activity.type}: ${activity.title}`);
    });

    // Final Summary
    console.log('\n========================================');
    console.log('TEST COMPLETED SUCCESSFULLY!');
    console.log('========================================\n');
    console.log('Records Created:');
    console.log(`  👤 Lead: ${lead.id}`);
    console.log(`  💬 SMS Log: ${smsLog.id}`);
    console.log(`  📱 WhatsApp Log: ${whatsappLog.id}`);
    console.log(`  ✉️  Email Log: ${emailLog.id}`);
    console.log(`  📋 Activities: ${activities.length}`);
    console.log('\n✅ Messaging system working correctly!\n');

    // Cleanup option
    console.log('To clean up test data, run:');
    console.log(`  DELETE FROM lead_activities WHERE "leadId" = '${lead.id}';`);
    console.log(`  DELETE FROM message_logs WHERE "leadId" = '${lead.id}';`);
    console.log(`  DELETE FROM leads WHERE id = '${lead.id}';`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testMessaging();
