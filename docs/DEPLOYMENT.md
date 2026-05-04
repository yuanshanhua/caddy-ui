# Deploying Caddy UI

## Prerequisites

- Caddy server v2.7+
- A dedicated subdomain (e.g., `caddy.example.com`)

## Quick Setup

### 1. Build the UI

```bash
git clone https://github.com/yuanshanhua/caddy-ui && cd caddy-ui
pnpm install
pnpm build
```

### 2. Copy dist/ to your server

```bash
scp -r dist/ your-server:/opt/caddy-ui/dist
```

### 3. Add to your Caddyfile

```caddyfile
{
  admin localhost:2019
}

caddy.example.com {
  basicauth {
    # Generate hash: caddy hash-password
    admin $2a$14$YOUR_BCRYPT_HASH_HERE
  }

  # API reverse proxy → Caddy Admin API
  handle /api/* {
    uri strip_prefix /api
    reverse_proxy localhost:2019 {
      header_up Host localhost:2019
      header_up Origin http://localhost:2019
    }
  }

  # Static files (SPA)
  handle {
    root * /opt/caddy-ui/dist
    try_files {path} /index.html
    file_server
  }
}
```

### 4. Reload Caddy

```bash
caddy reload --config /etc/caddy/Caddyfile
```

### 5. Access the UI

Navigate to `https://caddy.example.com/`

## Security Notes

1. **Always use HTTPS** in production — Caddy handles this automatically with a domain name
2. **Generate a strong password hash**: `caddy hash-password`
3. **Admin API stays local** — only accessible via the reverse proxy, never exposed directly
4. **Consider IP restrictions** if you want additional security:

   ```caddyfile
   @allowed remote_ip 10.0.0.0/8 192.168.0.0/16
   handle @allowed {
     # ... routes ...
   }
   ```

## Upgrading

To upgrade Caddy UI:

1. Build the new version: `pnpm build`
2. Replace the `dist/` folder on your server
3. No Caddy restart needed — file_server serves the new files immediately
