/**
 * Script: Assign Leads to Telecaller
 * This script helps assign existing leads to a telecaller user
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function assignLeadsToTelecaller() {
  console.log('========================================');
  console.log('ASSIGN LEADS TO TELECALLER');
  console.log('========================================\n');

  try {
    // Step 1: Get organization
    const org = await prisma.organization.findFirst();
    if (!org) {
      console.error('❌ No organization found');
      return;
    }
    console.log(`✅ Organization: ${org.name}\n`);

    // Step 2: Get all users with their roles
    console.log('Step 2: Finding users...\n');
    const users = await prisma.user.findMany({
      where: { organizationId: org.id, isActive: true },
      include: { role: { select: { name: true, slug: true } } },
    });

    console.log('Available Users:');
    console.log('─'.repeat(60));
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.firstName} ${user.lastName}`);
      console.log(`     Email: ${user.email}`);
      console.log(`     Role: ${user.role?.name || 'No role'} (${user.role?.slug || '-'})`);
      console.log(`     ID: ${user.id}`);
      console.log('');
    });

    // Step 3: Find telecaller role users or first available user
    const telecallerUser = users.find(u =>
      u.role?.slug === 'telecaller' ||
      u.role?.slug === 'counselor' ||
      u.role?.slug === 'sales'
    ) || users[0];

    if (!telecallerUser) {
      console.error('❌ No users found to assign leads to');
      return;
    }

    console.log(`\n📞 Selected Telecaller: ${telecallerUser.firstName} ${telecallerUser.lastName}`);
    console.log(`   Role: ${telecallerUser.role?.name || 'N/A'}\n`);

    // Step 4: Get unassigned leads
    const unassignedLeads = await prisma.lead.findMany({
      where: {
        organizationId: org.id,
        assignments: { none: { isActive: true } },
      },
      take: 10, // Assign first 10 unassigned leads
    });

    console.log(`Found ${unassignedLeads.length} unassigned leads\n`);

    if (unassignedLeads.length === 0) {
      // Check if there are any leads at all
      const totalLeads = await prisma.lead.count({ where: { organizationId: org.id } });
      console.log(`Total leads in system: ${totalLeads}`);

      if (totalLeads === 0) {
        console.log('\n⚠️  No leads found. Creating sample leads...\n');

        // Create sample leads
        const sampleLeads = [
          { firstName: 'Rahul', lastName: 'Kumar', phone: '+919876543001', email: 'rahul.kumar@example.com' },
          { firstName: 'Priya', lastName: 'Sharma', phone: '+919876543002', email: 'priya.sharma@example.com' },
          { firstName: 'Amit', lastName: 'Patel', phone: '+919876543003', email: 'amit.patel@example.com' },
          { firstName: 'Sneha', lastName: 'Gupta', phone: '+919876543004', email: 'sneha.gupta@example.com' },
          { firstName: 'Vikram', lastName: 'Singh', phone: '+919876543005', email: 'vikram.singh@example.com' },
        ];

        for (const lead of sampleLeads) {
          const newLead = await prisma.lead.create({
            data: {
              organizationId: org.id,
              ...lead,
              source: 'MANUAL',
              priority: 'MEDIUM',
            },
          });

          // Assign to telecaller
          await prisma.leadAssignment.create({
            data: {
              leadId: newLead.id,
              assignedToId: telecallerUser.id,
              assignedById: telecallerUser.id,
              isActive: true,
            },
          });

          console.log(`  ✅ Created & assigned: ${lead.firstName} ${lead.lastName}`);
        }

        console.log(`\n✅ Created and assigned ${sampleLeads.length} sample leads to ${telecallerUser.firstName}`);
      } else {
        console.log('\n⚠️  All leads are already assigned');

        // Show assigned leads
        const assignedLeads = await prisma.leadAssignment.findMany({
          where: {
            assignedToId: telecallerUser.id,
            isActive: true,
          },
          include: {
            lead: { select: { firstName: true, lastName: true, phone: true } },
          },
          take: 5,
        });

        if (assignedLeads.length > 0) {
          console.log(`\nLeads assigned to ${telecallerUser.firstName}:`);
          assignedLeads.forEach((a, i) => {
            console.log(`  ${i + 1}. ${a.lead.firstName} ${a.lead.lastName} - ${a.lead.phone}`);
          });
        }
      }
    } else {
      // Assign unassigned leads
      console.log('Assigning leads...\n');
      for (const lead of unassignedLeads) {
        await prisma.leadAssignment.create({
          data: {
            leadId: lead.id,
            assignedToId: telecallerUser.id,
            assignedById: telecallerUser.id,
            isActive: true,
          },
        });
        console.log(`  ✅ Assigned: ${lead.firstName} ${lead.lastName}`);
      }
      console.log(`\n✅ Assigned ${unassignedLeads.length} leads to ${telecallerUser.firstName}`);
    }

    // Final summary
    const totalAssigned = await prisma.leadAssignment.count({
      where: {
        assignedToId: telecallerUser.id,
        isActive: true,
      },
    });

    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`\n📊 Telecaller: ${telecallerUser.firstName} ${telecallerUser.lastName}`);
    console.log(`   Email: ${telecallerUser.email}`);
    console.log(`   Total Assigned Leads: ${totalAssigned}`);
    console.log('\n✅ Telecaller can now see these leads in the mobile app!\n');

    console.log('Login Credentials:');
    console.log(`   Email: ${telecallerUser.email}`);
    console.log(`   Password: (use existing password or reset)\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignLeadsToTelecaller();
