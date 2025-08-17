# Deployment Guide

Production deployment guide for Account Zero business management system.

## Prerequisites

### System Requirements
- **Node.js**: 18.x or higher
- **RAM**: Minimum 2GB, recommended 4GB+
- **Storage**: 10GB+ available space
- **OS**: Ubuntu 20.04+, CentOS 8+, or Windows Server 2019+

### External Services
- **MongoDB Atlas**: Cloud database cluster
- **Domain**: Registered domain with SSL certificate
- **Email Service**: SMTP server for notifications

## Environment Setup

### 1. Server Preparation
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install nginx -y
```

### 2. Application Deployment
```bash
# Clone repository
git clone https://github.com/your-org/account-zero.git
cd account-zero

# Install dependencies
npm ci --production

# Build application
npm run build
```

### 3. Environment Configuration
Create production `.env` file:
```env
# Database
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/accountzero"

# Authentication
NEXTAUTH_SECRET="your-super-secure-secret-key-here"
NEXTAUTH_URL="https://yourdomain.com"

# Company Settings
COMPANY_NAME="Your Company Name"
COMPANY_COUNTRY="ZA"

# Production Settings
NODE_ENV="production"
PORT=3000
SOCKET_PORT=5000

# Optional Features
ENABLE_NOTIFICATIONS="true"
ENABLE_REAL_TIME="true"

# Email Configuration (optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

### 4. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed initial data
npm run seed-database
npm run seed-products
```

## Process Management

### PM2 Configuration
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'account-zero',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### Start Application
```bash
# Create logs directory
mkdir logs

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

## Reverse Proxy Setup

### Nginx Configuration
Create `/etc/nginx/sites-available/account-zero`:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://localhost:3500;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO proxy
    location /socket.io/ {
        proxy_pass http://localhost:3500;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

### Enable Site
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/account-zero /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## SSL Certificate

### Using Let's Encrypt
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Monitoring & Logging

### PM2 Monitoring
```bash
# View logs
pm2 logs account-zero

# Monitor processes
pm2 monit

# Restart application
pm2 restart account-zero

# View status
pm2 status
```

### Log Rotation
Create `/etc/logrotate.d/account-zero`:
```
/path/to/account-zero/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
    postrotate
        pm2 reloadLogs
    endscript
}
```

## Database Backup

### Automated Backup Script
Create `backup.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"
DB_NAME="accountzero"

mkdir -p $BACKUP_DIR

# MongoDB Atlas backup using mongodump
mongodump --uri="mongodb+srv://username:password@cluster.mongodb.net/$DB_NAME" \
          --out="$BACKUP_DIR/backup_$DATE"

# Compress backup
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" -C "$BACKUP_DIR" "backup_$DATE"
rm -rf "$BACKUP_DIR/backup_$DATE"

# Keep only last 30 days of backups
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +30 -delete
```

### Schedule Backups
```bash
# Make script executable
chmod +x backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

## Security Hardening

### Firewall Configuration
```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Allow HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Deny direct access to application ports
sudo ufw deny 3000
sudo ufw deny 5000
```

### System Updates
```bash
# Enable automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Performance Optimization

### Node.js Optimization
```bash
# Increase memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
```

### Database Optimization
- Enable MongoDB Atlas auto-scaling
- Configure appropriate read/write concerns
- Set up database indexes for frequently queried fields

## Health Checks

### Application Health Check
Create `health-check.js`:
```javascript
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log('Health check passed');
    process.exit(0);
  } else {
    console.log('Health check failed');
    process.exit(1);
  }
});

req.on('error', () => {
  console.log('Health check failed');
  process.exit(1);
});

req.end();
```

### Monitoring Script
```bash
#!/bin/bash
# Add to crontab to run every 5 minutes
# */5 * * * * /path/to/monitor.sh

if ! node /path/to/health-check.js; then
    pm2 restart account-zero
    echo "$(date): Application restarted due to health check failure" >> /var/log/account-zero-monitor.log
fi
```

## Troubleshooting

### Common Issues

**Application Won't Start**
```bash
# Check logs
pm2 logs account-zero

# Check environment variables
pm2 env account-zero

# Restart application
pm2 restart account-zero
```

**Database Connection Issues**
```bash
# Test database connection
npx prisma db pull

# Check network connectivity
ping cluster.mongodb.net
```

**High Memory Usage**
```bash
# Monitor memory usage
pm2 monit

# Restart application
pm2 restart account-zero
```

## Rollback Procedure

### Quick Rollback
```bash
# Stop current version
pm2 stop account-zero

# Switch to previous version
git checkout previous-tag
npm ci --production
npm run build

# Restart application
pm2 restart account-zero
```

### Database Rollback
```bash
# Restore from backup
mongorestore --uri="mongodb+srv://username:password@cluster.mongodb.net/accountzero" \
             --drop /path/to/backup
```

## Scaling

### Horizontal Scaling
- Use PM2 cluster mode
- Configure load balancer (Nginx upstream)
- Implement session store (Redis)

### Vertical Scaling
- Increase server resources
- Optimize database queries
- Enable caching layers

## Support

For deployment issues:
- Check application logs: `pm2 logs account-zero`
- Review Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Monitor system resources: `htop`
- Contact support: support@accountzero.co.za