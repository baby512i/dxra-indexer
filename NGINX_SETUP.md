# Complete Nginx Setup Guide for indexer.dxra.me

## Important Note

**This guide assumes you already have Nginx installed and running with your existing configuration (wiki at `/wiki` and Next.js on port 3000).**

We will create a **separate server block** for the `indexer.dxra.me` subdomain. This will **NOT** modify your existing default server configuration. Your current setup will continue to work normally.

---

## Prerequisites
- VPS/Server with Ubuntu/Debian (or similar Linux distro)
- Nginx already installed and running
- Root or sudo access
- Your server's public IP address
- Cloudflare account with `dxra.me` domain

---

## Step 1: Cloudflare DNS Configuration

1. **Log in to Cloudflare Dashboard**
   - Go to https://dash.cloudflare.com
   - Select your `dxra.me` domain

2. **Add DNS Record**
   - Click **DNS** → **Records**
   - Click **Add record**
   - Configure:
     - **Type**: `A`
     - **Name**: `indexer`
     - **IPv4 address**: `YOUR_SERVER_IP` (replace with your actual server IP)
     - **Proxy status**: **Proxied** (orange cloud icon) - This enables Cloudflare SSL
     - **TTL**: Auto
   - Click **Save**

3. **Verify DNS Propagation** (wait 1-2 minutes)
   ```bash
   # Run this on your local machine
   nslookup indexer.dxra.me
   # Should return your server IP
   ```

---

## Step 2: Configure Nginx for indexer.dxra.me

**Note:** Since you already have Nginx running with your default configuration, we'll create a **separate server block** for the `indexer.dxra.me` subdomain. This won't affect your existing setup.

1. **Create a new Nginx configuration file for the subdomain:**

```bash
sudo nano /etc/nginx/sites-available/indexer.dxra.me
```

2. **Paste this configuration (matches your dxra.me style with SSL):**

```nginx
# HTTPS Server Block
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name indexer.dxra.me;

    # SSL Certificate (using same certificate as dxra.me)
    ssl_certificate /etc/letsencrypt/live/dxra.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dxra.me/privkey.pem;

    # Increase body size limit for API requests
    client_max_body_size 10M;

    # Logging
    access_log /var/log/nginx/indexer-access.log;
    error_log /var/log/nginx/indexer-error.log;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        
        # Headers for proper proxying (matching your dxra.me style)
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTP Server Block - Redirect to HTTPS (matching your dxra.me style)
server {
    listen 80;
    listen [::]:80;
    server_name indexer.dxra.me;
    return 301 https://$host$request_uri;
}
```

3. **Save and exit** (Ctrl+X, then Y, then Enter)

4. **Enable the site:**

```bash
# Create symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/indexer.dxra.me /etc/nginx/sites-enabled/

# Test Nginx configuration (this checks ALL configs, including your existing default)
sudo nginx -t
```

**Important:** This creates a separate server block. Your existing default server block (with `/wiki` and Next.js on port 3000) will remain unchanged and continue working.

5. **If test passes, reload Nginx:**

```bash
sudo systemctl reload nginx
```

**Verify your existing sites still work:**
- Your main site should still work normally
- `/wiki` should still work
- Next.js app should still work

---

## Step 3: Configure Firewall (UFW)

```bash
# Allow HTTP (port 80)
sudo ufw allow 80/tcp

# Allow HTTPS (port 443) - Cloudflare handles this
sudo ufw allow 443/tcp

# Allow your application port (8000) - only from localhost
# This is already localhost-only, but ensure firewall allows it
sudo ufw status
```

**Note**: Port 8000 should only be accessible from localhost (127.0.0.1), which is the default. Nginx will proxy to it.

---

```

### Option 2: Cloudflare Origin Certificate (Recommended for Cloudflare Users)

Cloudflare provides free Origin Certificates specifically for encrypting traffic between Cloudflare and your server:

1. **Get Origin Certificate from Cloudflare:**
   - Go to Cloudflare Dashboard → SSL/TLS → Origin Server
   - Click "Create Certificate"
   - Select: `indexer.dxra.me` (or use wildcard `*.dxra.me` for all subdomains)
   - Choose validity period (up to 15 years)
   - Click "Create"
   - Copy the **Origin Certificate** and **Private Key**

2. **Save the certificate files on your server:**
   ```bash
   sudo mkdir -p /etc/ssl/cloudflare
   sudo nano /etc/ssl/cloudflare/indexer.dxra.me.crt
   # Paste the Origin Certificate content
   
   sudo nano /etc/ssl/cloudflare/indexer.dxra.me.key
   # Paste the Private Key content
   
   # Set proper permissions
   sudo chmod 600 /etc/ssl/cloudflare/indexer.dxra.me.key
   sudo chmod 644 /etc/ssl/cloudflare/indexer.dxra.me.crt
   ```

**If the certificate works:** You're all set! No additional steps needed.

**If you get SSL errors:** Follow option 2 above to get a certificate that includes `indexer.dxra.me`.

---

## Step 5: Deploy Your Indexer Application

1. **Upload your code to the server** (using git, scp, or your preferred method):

```bash
# On your server
cd /opt  # or your preferred directory
git clone <your-repo-url> dxra-indexer
cd dxra-indexer
```

2. **Install dependencies:**

```bash
npm install
```

3. **Create `.env` file:**

```bash
nano .env
```

Add:
```env
PORT=8000
NODE_ENV=production
HELIUS_API_KEY=your-helius-api-key-here
```

4. **Build the application:**

```bash
npm run build
```

---

## Step 6: Run as a Service (PM2 - Recommended)

1. **Install PM2 globally:**

```bash
sudo npm install -g pm2
```

2. **Start your application:**

```bash
cd /opt/dxra-indexer  # or wherever your app is
pm2 start dist/main.js --name dxra-indexer
```

3. **Save PM2 configuration:**

```bash
pm2 save
```

4. **Setup PM2 to start on boot:**

```bash
pm2 startup
# Follow the instructions it prints (usually involves running a sudo command)
```

5. **Useful PM2 commands:**

```bash
# View logs
pm2 logs dxra-indexer

# Restart
pm2 restart dxra-indexer

# Stop
pm2 stop dxra-indexer

# Monitor
pm2 monit
```

---

## Step 7: Test Your Setup

1. **Test DNS resolution:**
```bash
nslookup indexer.dxra.me
```

2. **Test the API endpoint:**
```bash
curl https://indexer.dxra.me/pools?mint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

3. **Test health endpoint:**
```bash
curl https://indexer.dxra.me/
# Should return status and pool statistics
```

4. **Check Nginx logs:**
```bash
sudo tail -f /var/log/nginx/indexer-access.log
sudo tail -f /var/log/nginx/indexer-error.log
```

5. **Check application logs:**
```bash
pm2 logs dxra-indexer
```

---

## Step 8: Configure Helius API Key

The service uses WebSocket connections to Helius, so you only need to configure your API key:

1. **Get your Helius API Key:**
   - Log in to [Helius Dashboard](https://dashboard.helius.dev)
   - Navigate to the API section
   - Copy your API key

2. **Add to `.env` file:**
   ```env
   HELIUS_API_KEY=your-helius-api-key-here
   ```

3. **Restart the application:**
   ```bash
   pm2 restart dxra-indexer
   ```

The service will automatically:
- Connect to Helius WebSocket endpoints for both mainnet and devnet
- Subscribe to logs from all Raydium programs (CLMM, CPMM, AMMV4)
- Detect pool creations in real-time
- Handle reconnections automatically

**No webhook configuration needed!** The service connects directly to Helius via WebSocket.

---

## Troubleshooting

### Issue: 502 Bad Gateway
**Solution:**
- Check if your app is running: `pm2 list`
- Check if app is listening on port 8000: `sudo netstat -tlnp | grep 8000`
- Check Nginx error logs: `sudo tail -f /var/log/nginx/indexer-error.log`

### Issue: DNS not resolving
**Solution:**
- Wait a few minutes for DNS propagation
- Check Cloudflare DNS settings
- Verify A record points to correct IP

### Issue: Connection refused
**Solution:**
- Check firewall: `sudo ufw status`
- Verify Nginx is running: `sudo systemctl status nginx`
- Check Nginx config: `sudo nginx -t`

### Issue: WebSocket not connecting
**Solution:**
- Verify `HELIUS_API_KEY` is set correctly in `.env` file
- Check application logs: `pm2 logs dxra-indexer` for WebSocket connection status
- Verify your Helius API key is valid and has WebSocket access
- Check that your server allows outbound WebSocket connections (wss://)

---

## Security Checklist

- [ ] Firewall configured (UFW)
- [ ] Port 8000 only accessible from localhost
- [ ] Nginx configured with proper headers
- [ ] SSL enabled (Cloudflare or Let's Encrypt)
- [ ] `.env` file has secure permissions: `chmod 600 .env`
- [ ] Application runs as non-root user
- [ ] PM2 auto-restart configured
- [ ] Logs are being monitored

---

## Maintenance Commands

```bash
# View application status
pm2 status

# View logs
pm2 logs dxra-indexer --lines 100

# Restart application
pm2 restart dxra-indexer

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx status
sudo systemctl status nginx

# Test Nginx config
sudo nginx -t

# Reload Nginx (without downtime)
sudo systemctl reload nginx
```

---

## Next Steps

1. ✅ DNS configured in Cloudflare
2. ✅ Nginx installed and configured
3. ✅ Application deployed and running
4. ✅ Helius API key configured
5. ✅ Monitoring logs for WebSocket connections and pool detections

Your indexer is now live at: **https://indexer.dxra.me**

