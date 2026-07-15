# FieldFlow — Oracle Cloud Free Tier Deployment Guide

## Overview
This guide takes you from zero to a live production deployment on Oracle Cloud Free Tier with a custom domain, SSL certificate, and Nginx reverse proxy.

---

## Part 1 — Oracle Cloud Account Setup

### 1.1 Create Free Account
1. Go to **cloud.oracle.com** → click **Start for Free**
2. Enter your details — use a real credit card (required for verification, you won't be charged for free tier)
3. Choose **Home Region** — pick closest to your users (US East = Ashburn, US West = Phoenix)
4. Complete email verification

### 1.2 Create a VM Instance (Always Free)
1. In Oracle Cloud Console → **Compute** → **Instances** → **Create Instance**
2. Name: `fieldflow-prod`
3. Image: **Ubuntu 22.04** (Canonical)
4. Shape: **VM.Standard.A1.Flex** (Ampere ARM — Always Free: 4 OCPUs, 24GB RAM!)
   - Set OCPUs: `2`, Memory: `12 GB` (free tier limit)
5. Networking: Create new VCN named `fieldflow-vcn`
6. **SSH Keys**: Download the private key — save it as `fieldflow-key.pem`
7. Boot Volume: `50 GB` (free)
8. Click **Create**

### 1.3 Open Firewall Ports
After instance is running:
1. Go to instance → **Subnet** → **Security List** → **Add Ingress Rules**
2. Add these rules:

| Protocol | Source CIDR | Port | Description |
|---|---|---|---|
| TCP | 0.0.0.0/0 | 80 | HTTP |
| TCP | 0.0.0.0/0 | 443 | HTTPS |
| TCP | 0.0.0.0/0 | 22 | SSH |
| TCP | 0.0.0.0/0 | 3000 | Node.js (temp) |

3. Also open Ubuntu firewall on the server (done in Part 2)

---

## Part 2 — Server Setup

### 2.1 Connect via SSH
On Windows, open PowerShell or Git Bash:
```bash
# Fix key permissions (PowerShell)
icacls fieldflow-key.pem /inheritance:r
icacls fieldflow-key.pem /grant:r "%username%:R"

# Connect (replace YOUR_IP with your instance public IP)
ssh -i fieldflow-key.pem ubuntu@YOUR_ORACLE_IP
```

### 2.2 Initial Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager — keeps app running)
sudo npm install -g pm2

# Install Nginx (reverse proxy)
sudo apt install -y nginx

# Install Certbot (free SSL from Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx

# Open Ubuntu firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
sudo ufw --force enable

# Verify
node --version   # should be v20.x
npm --version
pm2 --version
nginx -v
```

### 2.3 Create App Directory
```bash
sudo mkdir -p /var/www/fieldflow
sudo chown ubuntu:ubuntu /var/www/fieldflow
cd /var/www/fieldflow
```

---

## Part 3 — Deploy the App

### 3.1 Upload Files from Windows
On your Windows machine, open PowerShell:
```powershell
# Upload the project (from your local fieldflow-deploy folder)
scp -i C:\Users\DELL\fieldflow-key.pem -r C:\Users\DELL\Desktop\fieldflow-deploy\fieldflow-deploy\* ubuntu@YOUR_ORACLE_IP:/var/www/fieldflow/
```

### 3.2 Install & Build on Server
```bash
cd /var/www/fieldflow

# Install dependencies
npm install --production=false

# Build Next.js
npm run build

# Test it runs
npm start &
# Visit http://YOUR_ORACLE_IP:3000 — should see your site
# Press Ctrl+C to stop
```

### 3.3 Create Environment File
```bash
nano /var/www/fieldflow/.env.local
```
Paste and fill in your values:
```env
NEXT_PUBLIC_SUPABASE_URL=https://uwjzurlovyjvmycxbvhz.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
MAPBOX_TOKEN=your_mapbox_token_here
PDCASH_WEBHOOK_SECRET=your_pdcash_webhook_signing_secret
RESEND_API_KEY=re_your_resend_key
NODE_ENV=production
PORT=3000
```
Save: `Ctrl+O` → Enter → `Ctrl+X`

### 3.4 Start with PM2
```bash
cd /var/www/fieldflow

# Create PM2 config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'fieldflow',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: '/var/www/fieldflow',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    env_file: '/var/www/fieldflow/.env.local',
    max_memory_restart: '1G',
    error_file: '/var/log/pm2/fieldflow-error.log',
    out_file: '/var/log/pm2/fieldflow-out.log',
  }]
}
EOF

# Create log directory
sudo mkdir -p /var/log/pm2
sudo chown ubuntu:ubuntu /var/log/pm2

# Start the app
pm2 start ecosystem.config.js

# Save so it auto-starts on reboot
pm2 save
pm2 startup
# Run the command it outputs (it starts with 'sudo env...')

# Check status
pm2 status
pm2 logs fieldflow --lines 20
```

---

## Part 4 — Domain & DNS Setup

### 4.1 Buy a Domain
Recommended registrars (cheapest first):
- **Namecheap.com** — `.com` ~$9/year
- **Cloudflare Registrar** — `.com` ~$9/year (at-cost pricing)
- **GoDaddy.com** — `.com` ~$12/year

Good domain options for FieldFlow:
- `fieldflow.app`
- `fieldflowphoto.com`
- `getfieldflow.com`
- `fieldflowbpo.com`

### 4.2 Point Domain to Oracle Server
In your domain registrar's DNS settings, add:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | @ | YOUR_ORACLE_IP | 300 |
| A | www | YOUR_ORACLE_IP | 300 |

Wait 5–30 minutes for DNS to propagate. Check: `ping yourdomain.com`

### 4.3 (Recommended) Use Cloudflare as DNS
Using Cloudflare as your DNS proxy gives you free DDoS protection and CDN:
1. Go to **cloudflare.com** → Add Site → enter your domain
2. Copy the 2 Cloudflare nameservers to your registrar
3. In Cloudflare DNS, add the A records above
4. Set proxy status to **DNS Only** (grey cloud) initially — switch to Proxied after SSL is set up

---

## Part 5 — Nginx + SSL Setup

### 5.1 Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/fieldflow
```
Paste:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

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
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Static files caching
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```
Save and exit.

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/fieldflow /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

### 5.2 Install SSL Certificate (Free via Let's Encrypt)
```bash
# Replace yourdomain.com with your actual domain
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts:
# - Enter email
# - Agree to terms
# - Choose option 2 (redirect HTTP to HTTPS)

# Auto-renewal test
sudo certbot renew --dry-run
```
Certbot automatically updates your Nginx config with HTTPS. SSL is free and auto-renews every 90 days.

### 5.3 Final Nginx Config Check
```bash
sudo nginx -t && sudo systemctl reload nginx
```
Visit `https://yourdomain.com` — you should see the FieldFlow site with a padlock.

---

## Part 6 — Update Vercel → Oracle Migration

After Oracle is working:

### 6.1 Update Environment Variables
On your server, update `.env.local`:
```bash
nano /var/www/fieldflow/.env.local
# Change NEXT_PUBLIC_BASE_URL to your domain
# Set PDCASH_WEBHOOK_SECRET from your pd.cash dashboard
```

### 6.2 Set Up pd.cash Webhook
1. Log in to your **pd.cash dashboard** → Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/pdcash/webhook`
3. Events to subscribe: `payment.completed`, `payment.failed`
4. Copy the webhook signing secret → paste as `PDCASH_WEBHOOK_SECRET` in `.env.local`

### 6.3 Rebuild and Restart
```bash
cd /var/www/fieldflow
npm run build
pm2 restart fieldflow
pm2 logs fieldflow --lines 30
```

---

## Part 7 — SEO Setup

### 7.1 Google Search Console
1. Go to **search.google.com/search-console**
2. Add Property → Domain type → enter your domain
3. Verify via DNS TXT record (add in Cloudflare/registrar)
4. Submit sitemap: `https://yourdomain.com/sitemap.xml`

### 7.2 Google Analytics (Optional)
1. Go to **analytics.google.com** → Create Property
2. Get your Measurement ID (G-XXXXXXXXXX)
3. Add to your `.env.local`: `NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX`

### 7.3 Update NEXT_PUBLIC_BASE_URL in Code
After you have your domain, add it to Vercel env vars too:
```
NEXT_PUBLIC_BASE_URL = https://yourdomain.com
GOOGLE_SITE_VERIFICATION = your_verification_code
```

### 7.4 SEO Checklist
- [x] `sitemap.xml` — auto-generated at `/sitemap.xml`
- [x] `robots.txt` — configured with disallow for dashboards
- [x] Open Graph tags on all pages
- [x] Twitter card tags
- [x] Schema.org JSON-LD organization markup
- [x] Canonical URLs
- [x] Semantic HTML (h1, h2, nav, main, aria labels)
- [x] Meta descriptions on all pages
- [x] Title templates (page name | FieldFlow)
- [ ] Submit to Google Search Console (after domain setup)
- [ ] Submit sitemap to Bing Webmaster Tools
- [ ] Set up Google Analytics

---

## Part 8 — Maintenance Commands

```bash
# View app logs
pm2 logs fieldflow

# Restart app
pm2 restart fieldflow

# Deploy updates (after pushing new code)
cd /var/www/fieldflow
git pull origin main        # if using git
npm install
npm run build
pm2 restart fieldflow

# Check server resources
htop
df -h     # disk usage
free -m   # memory usage

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# SSL certificate status
sudo certbot certificates

# Renew SSL manually (auto-renews, but just in case)
sudo certbot renew
```

---

## Part 9 — Setting Up Git on Server (Optional but Recommended)

This lets you deploy updates with one command:
```bash
# On server
cd /var/www/fieldflow
git init
git remote add origin https://github.com/estreetorder-alt/fieldflow.git
git pull origin main

# Future deployments from Windows:
# 1. git push (from your Windows machine)
# 2. On server: git pull && npm run build && pm2 restart fieldflow
```

---

## Quick Reference

| Item | Value |
|---|---|
| Server IP | YOUR_ORACLE_IP |
| SSH Command | `ssh -i fieldflow-key.pem ubuntu@YOUR_ORACLE_IP` |
| App Directory | `/var/www/fieldflow` |
| PM2 Status | `pm2 status` |
| Nginx Config | `/etc/nginx/sites-available/fieldflow` |
| Logs | `pm2 logs fieldflow` |
| Sitemap | `https://yourdomain.com/sitemap.xml` |
| SSL Renew | `sudo certbot renew` |
