# Deploying Caddy UI

## Prerequisites
- A running Caddy server (v2.7+)
- The `dist/` folder from `pnpm build`

## Quick Setup

### 1. Build the UI
```bash
cd caddy-ui
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

your-domain.com {
  # Protect UI with basic auth
  @ui path /ui /ui/*
  handle @ui {
    basicauth {
      # Generate hash: caddy hash-password
      admin $2a$14$YOUR_BCRYPT_HASH_HERE
    }
    uri strip_prefix /ui
    file_server {
      root /opt/caddy-ui/dist
      # SPA fallback — serve index.html for all non-file routes
      try_files {path} /index.html
    }
  }

  # Proxy API requests to Admin API
  @ui-api path /ui/api /ui/api/*
  handle @ui-api {
    basicauth {
      admin $2a$14$YOUR_BCRYPT_HASH_HERE
    }
    uri strip_prefix /ui/api
    reverse_proxy localhost:2019
  }

  # ... your other site configuration below ...
}
```

### 4. Reload Caddy
```bash
caddy reload --config /etc/caddy/Caddyfile
```

### 5. Access the UI
Navigate to `https://your-domain.com/ui/`

## Security Notes

1. **Always use HTTPS** in production — Caddy handles this automatically
2. **Generate a strong password hash**: `caddy hash-password`
3. **Admin API stays local** — only accessible via the reverse proxy, never exposed directly
4. **Consider IP restrictions** if you want additional security:
   ```caddyfile
   @ui {
     path /ui /ui/*
     remote_ip 10.0.0.0/8 192.168.0.0/16
   }
   ```

## Docker Deployment

```dockerfile
FROM caddy:2-alpine

COPY dist/ /srv/caddy-ui/
COPY Caddyfile /etc/caddy/Caddyfile
```

```caddyfile
{
  admin localhost:2019
}

:80 {
  handle /ui/* {
    basicauth {
      admin $2a$14$HASH
    }
    uri strip_prefix /ui
    file_server {
      root /srv/caddy-ui
      try_files {path} /index.html
    }
  }

  handle /ui/api/* {
    basicauth {
      admin $2a$14$HASH
    }
    uri strip_prefix /ui/api
    reverse_proxy localhost:2019
  }
}
```

## Upgrading

To upgrade Caddy UI:
1. Build the new version: `pnpm build`
2. Replace the `dist/` folder on your server
3. No Caddy restart needed — file_server serves the new files immediately

This is the key advantage over a plugin-based approach: **zero downtime upgrades**.
