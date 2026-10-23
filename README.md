# Lib Icons

Thư viện icon dùng chung cho theme Haravan và project React: gallery công khai để xem, tuỳ chỉnh, copy và tải icon; API chuẩn OpenAPI cho AI agent; khu vực admin để quản lý.

## Yêu cầu

- Node.js 20.6 trở lên (cần cờ `--env-file`)
- Một project Supabase

## Cài đặt

1. `npm install`
2. Copy `.env.example` thành `.env` và điền giá trị:
   - `SUPABASE_URL`: Project URL (Project Settings → Data API)
   - `SUPABASE_SERVICE_ROLE_KEY`: secret key (hoặc service_role kiểu cũ) — **chỉ dùng ở server**
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`: tài khoản đăng nhập admin (mật khẩu tối thiểu 8 ký tự)
   - `ADMIN_SESSION_SECRET`: chuỗi ngẫu nhiên tối thiểu 32 ký tự để ký session, tạo bằng
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `COOKIE_SECURE`: để `false` khi chạy local; đặt `true` khi deploy sau HTTPS
3. Chạy lần lượt các file trong `supabase/migrations/` bằng SQL Editor của Supabase.

## Chạy

| Lệnh | Việc |
|---|---|
| `npm run dev` | Server (8787) và Vite (5173) cùng lúc; mở http://localhost:5173 |
| `npm run build` | Kiểm tra ranh giới, build client vào `dist/client`, server vào `dist/server` |
| `npm start` | Chạy bản build; server phục vụ cả API lẫn client |
| `npm test` | Vitest |
| `npm run lint` | ESLint |

## Đường dẫn

| Path | Nội dung |
|---|---|
| `/` | Gallery |
| `/admin` | Khu vực admin |
| `/api/v1/*` | API công khai |
| `/api/auth/login`, `/api/auth/logout` | Đăng nhập / đăng xuất admin (session cookie) |
| `/api/admin/*` | API admin (cần session cookie) |
| `/api/docs` | Swagger UI |
| `/api/openapi.json` | OpenAPI spec |
