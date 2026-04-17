#!/bin/bash

# VoiceBridge - Complete Setup Script
# Run: bash deploy/setup-all.sh

set -e

cd /opt/voicebridge

echo "================================"
echo "VoiceBridge Complete Setup"
echo "================================"

echo ""
echo "[1/4] Running database migrations..."
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T backend npx prisma migrate deploy

echo ""
echo "[2/4] Creating super admin user..."
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T backend node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createSuperAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    const existingAdmin = await prisma.user.findFirst({
      where: { email: 'admin@voicebridge.com' }
    });

    if (existingAdmin) {
      console.log('Admin already exists');
      return;
    }

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

    await prisma.user.create({
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

    console.log('Super admin created!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

createSuperAdmin();
"

echo ""
echo "[3/4] Restarting backend..."
docker compose -f docker-compose.prod.yml --env-file .env.production restart backend

echo ""
echo "[4/4] Waiting for backend to be healthy..."
sleep 10

echo ""
echo "================================"
echo "Setup Complete!"
echo "================================"
echo ""
echo "Login at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'YOUR_IP')"
echo ""
echo "Credentials:"
echo "  Email: admin@voicebridge.com"
echo "  Password: Admin@123"
echo "================================"
