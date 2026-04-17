#!/bin/bash

# Create Super Admin User
# Run: bash deploy/create-admin.sh

cd /opt/voicebridge

echo "Creating super admin user..."

docker compose -f docker-compose.prod.yml --env-file .env.production exec -T backend node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createSuperAdmin() {
  try {
    // Hash password
    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    // Check if admin exists
    const existingAdmin = await prisma.user.findFirst({
      where: { email: 'admin@voicebridge.com' }
    });

    if (existingAdmin) {
      console.log('Admin already exists:', existingAdmin.email);
      return;
    }

    // Create organization first
    const org = await prisma.organization.create({
      data: {
        name: 'VoiceBridge Admin',
        tenantCode: 'VBADMIN',
        industry: 'Technology',
        subscriptionPlan: 'enterprise',
        subscriptionStatus: 'active',
        maxUsers: 100,
        maxLeads: 100000,
        maxCampaigns: 100,
        maxVoiceMinutes: 100000
      }
    });

    // Create super admin user
    const admin = await prisma.user.create({
      data: {
        email: 'admin@voicebridge.com',
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin',
        organizationId: org.id,
        isActive: true,
        emailVerified: true
      }
    });

    console.log('Super admin created successfully!');
    console.log('Email: admin@voicebridge.com');
    console.log('Password: Admin@123');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

createSuperAdmin();
"

echo ""
echo "================================"
echo "Super Admin Credentials:"
echo "Email: admin@voicebridge.com"
echo "Password: Admin@123"
echo "================================"
