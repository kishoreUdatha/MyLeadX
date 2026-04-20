# VoiceBridge Self-Hosted Edition

Deploy VoiceBridge CRM on your own infrastructure.

## Quick Start

```bash
chmod +x install.sh
./install.sh
```

## Requirements

- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM, 20GB disk
- Domain with DNS pointed to server

## Files

- `docker-compose.yml` - Production with Traefik/SSL
- `Dockerfile.backend` - Backend image
- `Dockerfile.frontend` - Frontend image
- `.env.example` - Configuration template
- `install.sh` - Installation wizard

## Commands

```bash
# Start
docker compose up -d

# Stop
docker compose down

# Logs
docker compose logs -f

# Update
docker compose pull && docker compose up -d
```

## Support

- Email: support@voicebridge.com
- Docs: https://docs.voicebridge.com/self-hosted
