# Deployment Guide

## Prerequisites
- Node.js 16+ installed
- MongoDB replica set (local single-node replica set or MongoDB Atlas)
- Git for version control

## Environment Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd the-wizards-bag
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   MONGODB_URI=mongodb://localhost:00000/the-wizards-bag
   PORT=3001
   NODE_ENV=production
   SESSION_SECRET=a-random-string-of-at-least-32-characters
   TRUST_PROXY=true
   SITE_URL=https://www.your-domain.com
   ```

   In production the app won't start without a real `SESSION_SECRET` (32+ characters, not the `.env.example` placeholder). Set `TRUST_PROXY=true` only if a host or reverse proxy sits in front of the app; see the README's Production Settings section.

## Local Development

1. **Start MongoDB** (if using local instance):
   ```bash
   mongod --replSet rs0
   mongosh --eval "rs.initiate()"
   ```

2. **Seed the database:**
   ```bash
   npm run seed
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   ```
   http://localhost:3001
   ```

## Production Deployment

### Option 1: Traditional VPS/Server

1. **Prepare the server:**
   ```bash
   # Install Node.js and MongoDB
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs mongodb
   ```

2. **Deploy the application:**
   ```bash
   git clone <repository-url>
   cd the-wizards-bag
   npm install --production
   ```

3. **Set up environment variables:**
   ```bash
   sudo nano /etc/environment
   # Add your environment variables
   ```

4. **Use PM2 for process management:**
   ```bash
   npm install -g pm2
   pm2 start src/server.js --name "the-wizards-bag"
   pm2 startup
   pm2 save
   ```

5. **Set up Nginx reverse proxy:**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Option 2: Heroku

1. **Create Heroku app:**
   ```bash
   heroku create the-wizards-bag
   ```

2. **Set environment variables:**
   ```bash
   heroku config:set MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/the-wizards-bag
   heroku config:set NODE_ENV=production
   heroku config:set SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
   heroku config:set TRUST_PROXY=true
   heroku config:set SITE_URL=https://the-wizards-bag.herokuapp.com
   ```

3. **Deploy:**
   ```bash
   git push heroku main
   ```

4. **Seed the database:**
   ```bash
   heroku run npm run seed
   ```

### Option 3: Docker

1. **Create Dockerfile:**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install --production
   COPY . .
   EXPOSE 3001
   CMD ["npm", "start"]
   ```

2. **Build and run:**
   ```bash
   docker build -t the-wizards-bag .
   docker run -p 3001:3001 --env-file .env the-wizards-bag
   ```

## Database Setup

Checkout uses MongoDB transactions to commit orders and inventory decrements atomically. MongoDB must run as a replica set; standalone instances cannot process checkout transactions.

New users are non-admin by default. Grant product-management access by setting `isAdmin: true` directly on a trusted user document.

### Local MongoDB
```bash
# Start MongoDB
mongod --replSet rs0 --dbpath /path/to/data/directory

# Initialize the single-node replica set once
mongosh --eval "rs.initiate()"

# Create database and user (optional)
mongo
use the-wizards-bag
db.createUser({
  user: "app_user",
  pwd: "secure_password",
  roles: ["readWrite"]
})
```

### MongoDB Atlas
1. Create cluster at https://cloud.mongodb.com
2. Create database user
3. Whitelist IP addresses
4. Get connection string
5. Update MONGODB_URI in environment variables

## SSL/HTTPS Setup

1. **Get SSL certificate** (Let's Encrypt recommended):
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

2. **Update Nginx configuration** for HTTPS redirect

## Monitoring and Logs

1. **Application logs:**
   ```bash
   pm2 logs the-wizards-bag
   ```

2. **Monitor performance:**
   ```bash
   pm2 monit
   ```

3. **Log files location:**
   - Application logs: `./logs/`
   - PM2 logs: `~/.pm2/logs/`
   - Nginx logs: `/var/log/nginx/`

## Backup Strategy

1. **Database backup:**
   ```bash
   # MongoDB backup
   mongodump --uri="mongodb://localhost:27017/the-wizards-bag" --out=/backup/$(date +%Y%m%d)
   ```

2. **Automated backup script:**
   ```bash
   #!/bin/bash
   # Add to crontab for daily backups
   # 0 2 * * * /path/to/backup.sh
   ```

## Troubleshooting

**Common issues:**
- Port already in use: Check running processes with `netstat -tulpn | grep :3001`
- MongoDB connection: Verify connection string, IP address and database permissions
- Permission errors: Check file permissions and user privileges
- Memory issues: Monitor with `htop` or `pm2 monit`

**Logs to check:**
- Application: `./logs/error.log`
- System: `/var/log/syslog`
- Web server: `/var/log/nginx/error.log`