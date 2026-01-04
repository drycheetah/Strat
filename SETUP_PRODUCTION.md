# STRAT Production Setup Guide

## Prerequisites

Before deploying STRAT in production, ensure you have:

### Required
- **Node.js** 18.x or higher
- **MongoDB** 6.0 or higher (local or MongoDB Atlas)
- **Git** for version control
- **SSL Certificate** (Let's Encrypt recommended)
- **Domain Name** pointed to your server
- **Server** with minimum 2GB RAM, 20GB storage

### Recommended
- **Redis** for session caching (optional but recommended)
- **Nginx** as reverse proxy
- **PM2** for process management
- **UFW** or firewall configured
- **Monitoring** tool (PM2, DataDog, New Relic)

## Step 1: Server Setup

### Ubuntu/Debian
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

## Step 2: Clone and Install

```bash
# Create application directory
sudo mkdir -p /var/www/strat
sudo chown $USER:$USER /var/www/strat
cd /var/www/strat

# Clone repository (or upload files)
git clone <your-repo-url> .

# Install dependencies
npm install --production

# Install additional production tools
npm install -g pm2
```

## Step 3: Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Generate secure JWT secret (256-bit)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Edit .env with production values
nano .env
```

### Production `.env` Configuration
```env
# Environment
NODE_ENV=production

# Server
PORT=3000
HOST=0.0.0.0

# P2P Network
P2P_PORT=6000
P2P_HOST=0.0.0.0

# Database (MongoDB Atlas example)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/strat?retryWrites=true&w=majority

# Or local MongoDB
# MONGODB_URI=mongodb://localhost:27017/strat

# Security - CHANGE ALL OF THESE
JWT_SECRET=<your-256-bit-random-hex-from-above>
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_TIME=900000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=https://yourdomain.com

# Blockchain Configuration
MINING_DIFFICULTY=4
MINING_REWARD=50
TRANSACTION_FEE=0.01
BLOCK_TIME_TARGET=10000
DIFFICULTY_ADJUSTMENT_INTERVAL=10

# Logging
LOG_LEVEL=info
LOG_FILE=logs/strat.log

# Email (for verification - optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com
```

## Step 4: MongoDB Setup

### Option A: Local MongoDB
```bash
# Create database and user
mongo
```

```javascript
use strat

db.createUser({
  user: "stratuser",
  pwd: "secure_password_here",
  roles: [{ role: "readWrite", db: "strat" }]
})

// Create indexes
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ username: 1 }, { unique: true })
db.wallets.createIndex({ address: 1 }, { unique: true })
db.wallets.createIndex({ user: 1 })
db.blocks.createIndex({ index: 1 }, { unique: true })
db.blocks.createIndex({ hash: 1 }, { unique: true })
db.blocks.createIndex({ timestamp: -1 })
```

### Option B: MongoDB Atlas (Recommended)
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster (M0)
3. Create database user
4. Whitelist your server IP (or 0.0.0.0/0 for testing)
5. Get connection string
6. Update MONGODB_URI in .env

## Step 5: SSL Certificate

```bash
# Get SSL certificate from Let's Encrypt
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Certificate will auto-renew. Test renewal:
sudo certbot renew --dry-run
```

## Step 6: Nginx Configuration

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/strat
```

```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates from certbot
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3000;
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

    # WebSocket support for P2P
    location /p2p {
        proxy_pass http://localhost:6000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/strat /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Step 7: Firewall Configuration

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow P2P port (if exposing directly)
sudo ufw allow 6000/tcp

# Check status
sudo ufw status
```

## Step 8: PM2 Process Management

```bash
# Start application with PM2
pm2 start index.js --name strat-blockchain

# Set PM2 to start on boot
pm2 startup
# Follow the command it outputs

# Save PM2 process list
pm2 save

# Monitor application
pm2 monit

# View logs
pm2 logs strat-blockchain

# Restart application
pm2 restart strat-blockchain
```

### PM2 Ecosystem File (Optional)
Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'strat-blockchain',
    script: './index.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
```

```bash
# Start with ecosystem file
pm2 start ecosystem.config.js
```

## Step 9: Initial Testing

```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Check if application is running
pm2 status

# Test API locally
curl http://localhost:3000/health

# Test from outside
curl https://yourdomain.com/api/stats

# Check logs
pm2 logs strat-blockchain
tail -f logs/combined.log
```

## Step 10: Create Admin User

```bash
# Connect to MongoDB
mongo strat
```

```javascript
// Create admin user
db.users.insertOne({
  email: "admin@yourdomain.com",
  username: "admin",
  password: "$2b$12$...", // Use bcrypt hash
  role: "admin",
  isVerified: true,
  wallets: [],
  loginAttempts: 0,
  createdAt: new Date()
})
```

Or use the API:
```bash
curl -X POST https://yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "username": "admin",
    "password": "SecurePassword123!"
  }'
```

## Step 11: Monitoring & Maintenance

### Setup PM2 Monitoring
```bash
# Free PM2 Plus monitoring
pm2 link <secret-key> <public-key>
```

### Log Rotation
```bash
# Install pm2-logrotate
pm2 install pm2-logrotate

# Configure
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### Database Backups
```bash
# Create backup script
nano /usr/local/bin/backup-strat-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/strat"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

mongodump --db=strat --out=$BACKUP_DIR/mongo_$DATE

# Keep only last 7 days
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +

echo "Backup completed: $DATE"
```

```bash
# Make executable
chmod +x /usr/local/bin/backup-strat-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add line:
0 2 * * * /usr/local/bin/backup-strat-db.sh
```

## Step 12: Security Hardening

### Disable Password Authentication (Use SSH Keys)
```bash
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart sshd
```

### Install Fail2Ban
```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Enable Automatic Security Updates
```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

## Troubleshooting

### Application Won't Start
```bash
# Check logs
pm2 logs strat-blockchain

# Check environment
cat .env

# Test MongoDB connection
mongo $MONGODB_URI

# Check port availability
sudo netstat -tuln | grep 3000
```

### Can't Connect Externally
```bash
# Check firewall
sudo ufw status

# Check Nginx
sudo nginx -t
sudo systemctl status nginx

# Check DNS
nslookup yourdomain.com

# Check SSL
curl -I https://yourdomain.com
```

### High Memory Usage
```bash
# Check processes
pm2 monit
htop

# Restart application
pm2 restart strat-blockchain

# Check for memory leaks
node --inspect index.js
```

## Production Checklist

- [ ] Environment variables configured
- [ ] MongoDB connection working
- [ ] SSL certificate installed
- [ ] Nginx configured and running
- [ ] Firewall enabled and configured
- [ ] PM2 running and set to auto-start
- [ ] Backups configured
- [ ] Monitoring setup
- [ ] Logs rotating properly
- [ ] Security headers configured
- [ ] Rate limiting tested
- [ ] Admin user created
- [ ] API endpoints tested
- [ ] WebSocket connection tested
- [ ] Domain DNS configured
- [ ] Email notifications working (if configured)

## Support

For issues or questions:
- Check logs: `pm2 logs strat-blockchain`
- Review documentation: `PRODUCTION_ARCHITECTURE.md`
- Monitor health: `https://yourdomain.com/health`

---

**Remember: This is production. Test thoroughly before going live.**
