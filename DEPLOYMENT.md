# 🚀 Stock Trader AI - Production Deployment Guide

## 📋 Pre-Deployment Checklist

### ✅ Development Testing Complete
- [x] Local access (localhost, 127.0.0.1) ✅
- [x] Local network access (192.168.110.83) ✅
- [x] CORS headers properly configured ✅
- [x] All API integrations working ✅
- [x] Authentication system functional ✅
- [x] Mobile-responsive UI ✅

### 🔧 Environment Setup

#### 1. Server Requirements
- **OS**: Linux (Ubuntu 20.04+ recommended)
- **Node.js**: v18+ or v20+
- **RAM**: Minimum 1GB, Recommended 2GB+
- **Storage**: Minimum 10GB free space
- **Network**: Public IP with ports 80, 443, 3000, 3001 accessible

#### 2. Domain Configuration
Configure DNS for `your-domain.com`:
```
Type    Name                        Value               TTL
A       your-domain.com             YOUR_PUBLIC_IP     3600
A       www.your-domain.com         YOUR_PUBLIC_IP     3600
```

#### 3. SSL Certificate Setup
```bash
# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com
```

## 🔥 Firewall Configuration

### Automatic Setup
```bash
# Run the automated firewall script
./scripts/configure-firewall.sh
```

### Manual Setup (Ubuntu/Debian)
```bash
# Enable UFW
sudo ufw enable

# Allow essential ports
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3000/tcp    # App port 1
sudo ufw allow 3001/tcp    # App port 2

# Verify configuration
sudo ufw status verbose
```

## 🌐 Production Server Setup

### 1. Clone and Install
```bash
# Clone repository
git clone <your-repo-url> /opt/stock-trader-ai
cd /opt/stock-trader-ai

# Install dependencies
npm ci --only=production

# Build application
npm run build
```

### 2. Environment Configuration
```bash
# Create production environment file
cp .env.local .env.production

# Edit production environment
nano .env.production
```

**Production Environment Variables:**
```env
# API Keys
NEXT_PUBLIC_FINNHUB_API_KEY=your_finnhub_api_key_here
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

# Authentication
USER_PASSWORD_HASH=your_bcrypt_password_hash_here
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=https://your-domain.com

# Server Configuration
PORT=3001
NODE_ENV=production
```

### 3. PM2 Process Management
```bash
# Install PM2 globally
npm install -g pm2

# Start application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the instructions provided by PM2

# Check status
pm2 status
pm2 logs stock-trader-ai
```

## 🔒 Nginx Reverse Proxy (Recommended)

### 1. Install Nginx
```bash
sudo apt update
sudo apt install nginx
```

### 2. Nginx Configuration
Create `/etc/nginx/sites-available/stocks.YOUR_USERNAME.com`:
```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name stocks.YOUR_USERNAME.com www.stocks.YOUR_USERNAME.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Configuration
server {
    listen 443 ssl http2;
    server_name stocks.YOUR_USERNAME.com www.stocks.YOUR_USERNAME.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/stocks.YOUR_USERNAME.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/stocks.YOUR_USERNAME.com/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Favicon
    location = /favicon.ico {
        log_not_found off;
        access_log off;
    }

    # Robots.txt
    location = /robots.txt {
        log_not_found off;
        access_log off;
    }
}
```

### 3. Enable Nginx Site
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/stocks.YOUR_USERNAME.com /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 🔄 SSL Certificate Auto-Renewal

### Setup Certbot Auto-Renewal
```bash
# Test renewal
sudo certbot renew --dry-run

# Add to crontab for auto-renewal
sudo crontab -e

# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoring & Logging

### 1. Setup Log Rotation
Create `/etc/logrotate.d/stock-trader-ai`:
```
/var/log/stock-trader-ai/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 nodejs nodejs
    postrotate
        pm2 reload stock-trader-ai
    endscript
}
```

### 2. System Monitoring
```bash
# Install monitoring tools
sudo apt install htop iotop nethogs

# Monitor application
pm2 monit
pm2 logs stock-trader-ai --lines 50
```

### 3. Health Check Script
Create `/opt/stock-trader-ai/scripts/health-check.sh`:
```bash
#!/bin/bash
HEALTH_URL="https://stocks.YOUR_USERNAME.com"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")

if [ "$STATUS" -eq 200 ]; then
    echo "$(date): Health check passed"
else
    echo "$(date): Health check failed - Status: $STATUS"
    pm2 restart stock-trader-ai
fi
```

## 🚦 Performance Optimization

### 1. Node.js Optimization
```bash
# Set Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"

# Enable production optimizations
export NODE_ENV=production
```

### 2. Database Optimization (if using)
```bash
# For SQLite (if implemented)
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA cache_size=1000000;
```

## 🔒 Security Hardening

### 1. Fail2Ban Setup
```bash
# Install Fail2Ban
sudo apt install fail2ban

# Configure for Nginx
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit jail.local and enable nginx sections
sudo nano /etc/fail2ban/jail.local

# Restart Fail2Ban
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban
```

### 2. Regular Security Updates
```bash
# Auto-update security packages
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 📱 Mobile PWA Setup

### 1. Generate App Icons
Create icons in `/public/`:
- `icon-192.png` (192x192)
- `icon-512.png` (512x512)
- `apple-touch-icon.png` (180x180)

### 2. Service Worker (Optional)
The app is already configured as a PWA with the manifest.json file.

## 🧪 Production Testing

### 1. Automated Testing
```bash
# Run production tests
npm run test:prod

# Test all access points
./scripts/test-network-access.sh
```

### 2. Load Testing
```bash
# Install Apache Bench
sudo apt install apache2-utils

# Basic load test
ab -n 1000 -c 10 https://stocks.YOUR_USERNAME.com/
```

## 📞 Troubleshooting

### Common Issues

#### 1. SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal
```

#### 2. Application Not Starting
```bash
# Check PM2 logs
pm2 logs stock-trader-ai

# Check system resources
free -h
df -h
```

#### 3. Network Connectivity
```bash
# Test external API access
curl -I https://finnhub.io
curl -I https://generativelanguage.googleapis.com

# Check DNS resolution
nslookup stocks.YOUR_USERNAME.com
```

## 🆘 Emergency Procedures

### 1. Quick Restart
```bash
pm2 restart stock-trader-ai
sudo systemctl restart nginx
```

### 2. Rollback
```bash
# Stop current version
pm2 stop stock-trader-ai

# Restore from backup
git checkout previous-working-commit

# Rebuild and restart
npm run build
pm2 start ecosystem.config.js
```

### 3. Emergency Contact
If critical issues occur:
1. Check application logs: `pm2 logs stock-trader-ai`
2. Check system resources: `htop`
3. Check network connectivity: `ping 8.8.8.8`
4. Restart services if necessary

## ✅ Post-Deployment Verification

After deployment, verify:
- [ ] HTTPS access works: https://stocks.YOUR_USERNAME.com
- [ ] Login functionality works
- [ ] Stock data loads correctly
- [ ] AI recommendations function
- [ ] Trading interface responsive
- [ ] Mobile experience optimal
- [ ] All API calls successful
- [ ] Performance acceptable (<3s load time)

---

## 🎉 Deployment Complete!

Your Stock Trader AI application is now production-ready and accessible from:
- **Primary**: https://stocks.YOUR_USERNAME.com
- **Direct IP**: https://110.81.15.51 (if certificate configured)
- **Local Network**: http://192.168.110.83:3001

**Login Credentials:**
- Username: `YOUR_USERNAME`
- Password: `YOUR_PASSWORD`

Monitor the application regularly and keep dependencies updated for optimal security and performance.