#!/bin/bash

# MyLeadX - EC2 User Data Script
# This runs automatically when the EC2 instance is first created

set -e

exec > /var/log/user-data.log 2>&1

echo "=========================================="
echo "MyLeadX EC2 Setup Starting..."
echo "=========================================="

# Wait for network to be ready
sleep 30

# Retry apt update (handles mirror sync issues)
for i in {1..5}; do
    echo "Attempt $i: Running apt update..."
    apt-get update && break
    echo "apt update failed, retrying in 30 seconds..."
    sleep 30
done

# Upgrade system
apt-get upgrade -y

# Install Docker with retry
for i in {1..3}; do
    echo "Attempt $i: Installing Docker..."
    curl -fsSL https://get.docker.com | sh && break
    echo "Docker install failed, retrying in 30 seconds..."
    sleep 30
done

# Add ubuntu user to docker group
usermod -aG docker ubuntu

# Install Docker Compose and Git
apt-get install -y docker-compose-plugin git

# Create app directory
mkdir -p /opt/myleadx

# Clone repository with retry
for i in {1..3}; do
    echo "Attempt $i: Cloning repository..."
    git clone ${github_repo} /opt/myleadx && break
    echo "Git clone failed, retrying in 30 seconds..."
    rm -rf /opt/myleadx
    mkdir -p /opt/myleadx
    sleep 30
done

# Set ownership
chown -R ubuntu:ubuntu /opt/myleadx

# Copy environment file
cd /opt/myleadx
cp deploy/aws/env.aws.template .env.production
chown ubuntu:ubuntu .env.production

# Pull Docker images in advance
cd /opt/myleadx
docker compose -f docker-compose.prod.yml pull || true

# Build and start the application
sudo -u ubuntu docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build || true

echo "=========================================="
echo "MyLeadX EC2 Setup Complete!"
echo "=========================================="
echo "Check status: docker ps"
echo "View logs: docker compose -f docker-compose.prod.yml logs -f"
