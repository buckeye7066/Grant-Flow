# GrantFlow Deployment Guide
## Deploying to www.axiombiolabs.org/grantflow

### Overview
This guide covers deploying GrantFlow to a subdirectory (/grantflow) on your existing website.

---

## Option 1: Shared Hosting / cPanel

### Step 1: Build the Frontend
```bash
cd G:\Apps\grantflow-local\frontend
npm run build
```
This creates a `dist` folder with the production build.

### Step 2: Upload Files
1. Connect to your hosting via FTP or cPanel File Manager
2. Navigate to `public_html` (or your web root)
3. Create a folder called `grantflow`
4. Upload the contents of `frontend/dist` to `public_html/grantflow/`

### Step 3: Configure .htaccess
Create `public_html/grantflow/.htaccess`:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /grantflow/
  
  # Handle API requests (proxy to backend)
  RewriteCond %{REQUEST_URI} ^/grantflow/api/
  RewriteRule ^api/(.*)$ http://localhost:3001/api/$1 [P,L]
  
  # Handle client-side routing
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /grantflow/index.html [L]
</IfModule>
```

### Step 4: Deploy Backend
You'll need a Node.js hosting solution. Options:
- **Same server (if Node.js available)**: Run PM2 or systemd service
- **Separate VPS**: Deploy backend to a VPS (DigitalOcean, Linode, etc.)
- **Cloud Platform**: Deploy to Render, Railway, or Heroku

---

## Option 2: VPS Deployment (Recommended)

### Step 1: Server Setup
```bash
# SSH into your server
ssh user@your-server

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx
```

### Step 2: Clone and Build
```bash
# Clone your project
cd /var/www
git clone your-repo-url grantflow
cd grantflow

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Build frontend
npm run build
```

### Step 3: Configure Nginx
Create `/etc/nginx/sites-available/grantflow`:
```nginx
server {
    listen 80;
    server_name www.axiombiolabs.org axiombiolabs.org;

    # Your existing site root
    root /var/www/axiombiolabs;
    index index.html index.php;

    # Existing site handling
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # GrantFlow subdirectory
    location /grantflow {
        alias /var/www/grantflow/frontend/dist;
        try_files $uri $uri/ /grantflow/index.html;
    }

    # GrantFlow API proxy
    location /grantflow/api {
        rewrite ^/grantflow/api/(.*)$ /api/$1 break;
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # PHP handling for existing site (if needed)
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/grantflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: Start Backend with PM2
Create `/var/www/grantflow/ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'grantflow-api',
    cwd: '/var/www/grantflow/backend',
    script: 'server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      OPENAI_API_KEY: 'your-openai-key'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
}
```

Start the backend:
```bash
cd /var/www/grantflow
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 5: SSL Certificate
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d axiombiolabs.org -d www.axiombiolabs.org
```

---

## Option 3: Cloud Platform (Easiest)

### Using Render.com

1. **Frontend (Static Site)**
   - Connect your GitHub repo
   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `frontend/dist`
   - Add environment variable: `VITE_API_URL=https://your-backend.onrender.com`

2. **Backend (Web Service)**
   - Connect your GitHub repo
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && node server.js`
   - Add environment variables:
     - `NODE_ENV=production`
     - `OPENAI_API_KEY=your-key`

### Using Railway.app

Similar to Render, but with automatic detection. Just connect your repo and it will deploy both services.

---

## Environment Configuration

### Frontend (.env.production)
Create `frontend/.env.production`:
```
VITE_API_URL=https://www.axiombiolabs.org/grantflow/api
```

### Backend (.env)
Create `backend/.env`:
```
NODE_ENV=production
PORT=3001
OPENAI_API_KEY=your-openai-api-key
DATABASE_PATH=./data/grantflow.db
```

---

## Database Backup

Set up automatic backups:
```bash
# Create backup script
cat > /var/www/grantflow/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/var/backups/grantflow
mkdir -p $BACKUP_DIR
cp /var/www/grantflow/backend/data/grantflow.db $BACKUP_DIR/grantflow_$DATE.db
# Keep only last 30 days
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
EOF

chmod +x /var/www/grantflow/backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/grantflow/backup.sh") | crontab -
```

---

## Quick Checklist

- [ ] Update `vite.config.js` with `base: '/grantflow/'`
- [ ] Build frontend: `npm run build`
- [ ] Deploy frontend files to `/grantflow/` directory
- [ ] Configure web server (Nginx/Apache) to:
  - Serve static files from `/grantflow/`
  - Proxy `/grantflow/api/*` to backend
  - Handle SPA routing (redirect to index.html)
- [ ] Deploy backend with PM2 or similar
- [ ] Set environment variables
- [ ] Configure SSL certificate
- [ ] Set up database backups
- [ ] Test all features

---

## Troubleshooting

### "404 Not Found" on page refresh
- Ensure `.htaccess` or Nginx config handles SPA routing
- All routes should fall back to `/grantflow/index.html`

### API calls failing
- Check that proxy is configured correctly
- Verify backend is running: `pm2 status`
- Check logs: `pm2 logs grantflow-api`

### Blank page
- Check browser console for errors
- Verify `base` in vite.config.js matches deployment path
- Ensure all assets are loading from correct path

### Database errors
- Check file permissions on `data/` directory
- Ensure SQLite is installed on server

---

## Support

For assistance with deployment, contact:
- Email: Dr.JohnWhite@axiombiolabs.org
- Phone: 423-504-7778
