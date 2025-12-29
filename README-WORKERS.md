# Cloudflare Workers Deployment Guide

Hướng dẫn deploy SoundCloud Proxy Server lên Cloudflare Workers (Edge).

## Cài đặt

1. **Cài đặt Wrangler CLI:**
   ```bash
   npm install
   ```

2. **Đăng nhập Cloudflare:**
   ```bash
   npx wrangler login
   ```

## Cấu hình

### Cách 1: Hardcode trong `src/index.js` (đơn giản nhất)
Mở `src/index.js` và thay đổi dòng 8:
```javascript
clientId: 'your_client_id_here', // Hardcode trực tiếp
```

### Cách 2: Sử dụng Secrets (khuyến nghị cho production)
```bash
npx wrangler secret put SOUNDCLOUD_CLIENT_ID
# Nhập client ID khi được hỏi
```

### Cách 3: Query parameter (linh hoạt)
```
https://your-worker.workers.dev/api/soundcloud/search?q=search_term&client_id=your_client_id
```

## Development

Chạy local development server:
```bash
npm run worker:dev
```

## Deploy

Deploy lên Cloudflare Workers:
```bash
npm run worker:deploy
```

## Xem logs

Xem real-time logs:
```bash
npm run worker:tail
```

## Endpoints

- **Search:** `GET /api/soundcloud/search?q=search_term&limit=10`
- **Health:** `GET /health`

## Custom Domain (Optional)

Để sử dụng custom domain, uncomment và cấu hình trong `wrangler.toml`:
```toml
routes = [
  { pattern = "soundcloud-proxy.yourdomain.com", zone_name = "yourdomain.com" }
]
```

## Lợi ích của Cloudflare Workers

- ✅ Chạy trên Edge network (gần người dùng hơn)
- ✅ Không cần server, không tốn chi phí hosting
- ✅ Tự động scale
- ✅ Free tier rộng rãi
- ✅ Không cần Dockerfile
- ✅ Deploy nhanh chóng

