#!/bin/bash

# VoiceBridge - Nginx Setup Script
# Run: bash deploy/setup-nginx.sh

echo "Setting up Nginx..."

# Install nginx if not installed
sudo yum install -y nginx

# Create nginx config
sudo tee /etc/nginx/conf.d/voicebridge.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
EOF

# Remove default config if exists
sudo rm -f /etc/nginx/conf.d/default.conf

# Test and restart
sudo nginx -t && sudo systemctl restart nginx && sudo systemctl enable nginx

echo "Nginx setup complete!"
echo "Test: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
