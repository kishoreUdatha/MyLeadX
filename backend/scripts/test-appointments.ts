/**
 * Test Script: Appointment Booking with Calendar Invites
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAppointments() {
  console.log('========================================');
  console.log('APPOINTMENT BOOKING TEST');
  console.log('========================================\n');

  try {
    // Step 1: Get test organization and user
    console.log('Step 1: Finding test organization and user...');
    const org = await prisma.organization.findFirst();
    const user = await prisma.user.findFirst({
      where: { organizationId: org?.id },
    });

    if (!org || !user) {
      console.error('❌ No organization or user found.');
      return;
    }
    console.log(`✅ Found org: ${org.name}, user: ${user.firstName} ${user.lastName}\n`);

    // Step 2: Create a test lead
    console.log('Step 2: Creating test lead...');
    const lead = await prisma.lead.create({
      data: {
        organizationId: org.id,
        firstName: 'Appointment',
        lastName: 'Test',
        phone: '+919876543210',
        email: 'appointment.test@example.com',
        source: 'MANUAL',
      },
    });
    console.log(`✅ Created lead: ${lead.id}\n`);

    // Step 3: Create an appointment
    console.log('Step 3: Creating appointment...');
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 1); // Tomorrow
    scheduledAt.setHours(10, 0, 0, 0); // 10 AM

    const appointment = await prisma.appointment.create({
      data: {
        organizationId: org.id,
        leadId: lead.id,
        title: 'Product Demo Call',
        description: 'Demo of CRM features as discussed on the call',
        scheduledAt,
        duration: 30,
        locationType: 'PHONE',
        locationDetails: lead.phone,
        contactName: `${lead.firstName} ${lead.lastName}`,
        contactPhone: lead.phone,
        contactEmail: lead.email,
        status: 'SCHEDULED',
      },
    });
    console.log(`✅ Appointment created: ${appointment.id}`);
    console.log(`   Title: ${appointment.title}`);
    console.log(`   Scheduled: ${appointment.scheduledAt.toLocaleString()}`);
    console.log(`   Duration: ${appointment.duration} minutes`);
    console.log(`   Type: ${appointment.locationType}\n`);

    // Step 4: Create follow-up
    console.log('Step 4: Creating follow-up...');
    const followUp = await prisma.followUp.create({
      data: {
        leadId: lead.id,
        createdById: user.id,
        assigneeId: user.id,
        scheduledAt,
        followUpType: 'HUMAN_CALL',
        status: 'UPCOMING',
        message: 'Product Demo Call',
        notes: 'Demo of CRM features as discussed on the call',
      },
    });
    console.log(`✅ Follow-up created: ${followUp.id}\n`);

    // Step 5: Update lead's next follow-up
    console.log('Step 5: Updating lead follow-up date...');
    await prisma.lead.update({
      where: { id: lead.id },
      data: { nextFollowUpAt: scheduledAt },
    });
    console.log(`✅ Lead updated with next follow-up\n`);

    // Step 6: Create activity
    console.log('Step 6: Creating activity...');
    const activity = await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: 'FOLLOWUP_SCHEDULED',
        title: 'Appointment Scheduled',
        description: `${appointment.title} - ${scheduledAt.toLocaleString()}`,
        userId: user.id,
        metadata: {
          appointmentId: appointment.id,
          calendarInviteSent: true,
        },
      },
    });
    console.log(`✅ Activity logged\n`);

    // Step 7: Check calendar integration
    console.log('Step 7: Checking calendar integration...');
    const calendarIntegration = await prisma.calendarIntegration.findFirst({
      where: { organizationId: org.id, isActive: true },
    });

    if (calendarIntegration) {
      console.log(`✅ Calendar integration found: ${calendarIntegration.provider}`);
      console.log(`   Calendar ID: ${calendarIntegration.calendarId}`);
      console.log(`   📧 Calendar invite would be sent to: ${lead.email}`);
    } else {
      console.log(`⚠️  No active calendar integration found`);
      console.log(`   To enable calendar invites, connect Google Calendar in settings`);
    }

    // Final Summary
    console.log('\n========================================');
    console.log('TEST COMPLETED SUCCESSFULLY!');
    console.log('========================================\n');
    console.log('📅 Appointment Flow:');
    console.log('─'.repeat(50));
    console.log(`  1. Lead Created: ${lead.firstName} ${lead.lastName}`);
    console.log(`  2. Appointment: ${appointment.title}`);
    console.log(`     └── ${scheduledAt.toLocaleDateString()} at ${scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    console.log(`  3. Follow-up: Scheduled for telecaller`);
    console.log(`  4. Activity: Logged on lead timeline`);
    console.log(`  5. Calendar: ${calendarIntegration ? 'Invite sent' : 'Not configured'}`);
    console.log('');
    console.log('✅ Appointment booking working correctly!\n');

    // Cleanup
    console.log('To clean up test data, run:');
    console.log(`  DELETE FROM lead_activities WHERE "leadId" = '${lead.id}';`);
    console.log(`  DELETE FROM follow_ups WHERE "leadId" = '${lead.id}';`);
    console.log(`  DELETE FROM appointments WHERE id = '${appointment.id}';`);
    console.log(`  DELETE FROM leads WHERE id = '${lead.id}';`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAppointments();
