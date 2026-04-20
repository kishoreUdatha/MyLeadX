#!/bin/bash
# VoiceBridge Self-Hosted Installation Script

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     VoiceBridge Self-Hosted Installation                  ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker installed${NC}"

# Collect configuration
read -p "Enter your license key: " LICENSE_KEY
read -p "Enter your domain (e.g., crm.yourcompany.com): " APP_DOMAIN
read -p "Enter your CRM name [VoiceBridge]: " APP_NAME
APP_NAME=${APP_NAME:-VoiceBridge}
read -p "Enter admin email: " ADMIN_EMAIL
read -sp "Enter admin password: " ADMIN_PASSWORD
echo ""

# Generate secrets
DB_PASSWORD=$(openssl rand -base64 16 | tr -d '/+=')
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 24 | cut -c1-32)

# Create .env
cat > .env << EOF
LICENSE_KEY=${LICENSE_KEY}
LICENSE_SERVER_URL=https://license.voicebridge.com
APP_DOMAIN=${APP_DOMAIN}
APP_NAME=${APP_NAME}
COMPOSE_PROJECT_NAME=voicebridge
VERSION=latest
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
DB_USER=voicebridge
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=voicebridge
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
CREDENTIALS_ENCRYPTION_KEY=${ENCRYPTION_KEY}
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
TRAEFIK_LOG_LEVEL=INFO
TZ=UTC
EOF

chmod 600 .env
echo -e "${GREEN}✓ Configuration saved${NC}"

# Create directories
mkdir -p logs/backend logs/traefik backups

# Start services
echo "Starting services..."
docker compose up -d

echo ""
echo -e "${GREEN}Installation Complete!${NC}"
echo ""
echo "Access your CRM at: https://${APP_DOMAIN}"
echo "Admin: ${ADMIN_EMAIL}"
