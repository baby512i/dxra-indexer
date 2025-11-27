server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name indexer.dxra.me;

    # SSL Certificate (using same certificate as dxra.me)
    ssl_certificate /etc/letsencrypt/live/dxra.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dxra.me/privkey.pem;

    # Increase body size limit for webhook payloads
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
