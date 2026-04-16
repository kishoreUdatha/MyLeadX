#!/bin/bash

# VoiceBridge - EC2 User Data Script
# This runs automatically when the EC2 instance is first created

set -e

exec > /var/log/user-data.log 2>&1

echo "=========================================="
echo "VoiceBridge EC2 Setup Starting..."
echo "=========================================="

# Update system
apt-get update
apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu

# Install Docker Compose
apt-get install -y docker-compose-plugin

# Install additional tools
apt-get install -y git nginx certbot python3-certbot-nginx htop

# Create app directory
mkdir -p /opt/voicebridge
cd /opt/voicebridge

# Clone repository
git clone ${github_repo} .
chown -R ubuntu:ubuntu /opt/voicebridge

# Copy environment template
cp deploy/aws/env.aws.template .env.production
chown ubuntu:ubuntu .env.production

# Set permissions
chmod +x deploy/aws/*.sh

echo "=========================================="
echo "VoiceBridge EC2 Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. SSH into the server"
echo "2. Edit /opt/voicebridge/.env.production"
echo "3. Run: cd /opt/voicebridge && docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build"
echo ""
