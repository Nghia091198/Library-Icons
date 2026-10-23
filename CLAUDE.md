# CLAUDE.md — Lib Icons

Thư viện icon dùng chung: gallery cho merchant xem, tuỳ chỉnh, copy và tải icon; API cho AI agent dựng theme Haravan; admin để upload và quản lý.
Stack: Hono + `@hono/zod-openapi` (Node 20), React + Vite, Supabase.

## ✍️ Code Style
- Không viết comment giải thích code làm gì — đặt tên rõ ràng thay cho comment.
- Chỉ comment khi có ràng buộc bên ngoài hoặc lý do không hiển nhiên.
- TypeScript strict; không `any` (dùng type cụ thể hoặc `unknown`).
- Function components + hooks, không class component.

## 📁 Project Structure
```
src/
├── server/        # Hono — chạy trên Node
│   ├── index.ts   # Entry production: đọc config, tạo app, serve
│   ├── app.ts     # createApp(deps) — không đọc env, để test được
│   ├── config.ts  # Nơi DUY NHẤT đọc process.env
│   ├── auth/      # Xác thực access token
│   ├── middleware/
│   ├── routes/    # Mỗi file: schema zod + createRoute + register…Route(app)
│   ├── db/        # Supabase client service-role
│   └── lib/       # logger, httpError
├── client/        # React SPA
│   ├── gallery/   # Khu vực công khai cho merchant
│   ├── admin/     # Khu vực admin (cần đăng nhập)
│   └── common/    # apiClient, supabaseBrowser, service/hook dùng chung
└── shared/        # Dùng chung client + server — KHÔNG DOM, KHÔNG Node API
    ├── constants/ # Hằng số `as const`: route API, mã lỗi
    ├── types/     # Type request/response API
    └── lib/       # Hàm thuần
supabase/migrations/  # SQL đánh số tăng dần, chạy theo thứ tự
tests/                # Mirror src/ (tests/server/…, tests/shared/…)
```

## 🔄 Data flow
- **Client:** service (gọi `api` trong `common/apiClient.ts`) → hook → component. Component không gọi `fetch` hay Supabase trực tiếp.
- **Server:** route → service → db. Lỗi nghiệp vụ ném `HttpError`; `app.onError` trả format chuẩn `{ error: { code, message, details } }`.

## 🌐 API
- Mọi API nằm dưới `/api`: public `/api/v1/*`, admin `/api/admin/*` (middleware `requireAdmin`). SPA dùng các path còn lại (`/`, `/admin`…).
- Mọi route khai báo bằng `createRoute` để có trong OpenAPI (`/api/openapi.json`, Swagger ở `/api/docs`). Không dùng `app.get/post` thường cho API.
- Schema response gắn `satisfies z.ZodType<…>` với type trong `shared/types` để server và client không lệch nhau.
- Message lỗi viết tiếng Anh (agent đọc); UI viết tiếng Việt.

## 🚧 Ranh giới (build fail nếu vi phạm)
- `client/` không import `server/`; `server/` không import `client/`.
- `shared/` chỉ import `shared/`; không `window`, `document`, `process`, `Buffer`, `node:*`.
- Kiểm tra: `npm run typecheck:boundaries` (nằm trong `npm run build`) và `npm run lint`.

## 🔤 Constants & types
- Không viết cứng chuỗi/số có ý nghĩa nghiệp vụ (route, mã lỗi, trạng thái, giới hạn).
- Dùng object `as const` + type suy ra — không dùng TypeScript `enum`.

## 🔐 Bảo mật
- Admin duy nhất, khai báo bằng `ADMIN_EMAIL` / `ADMIN_PASSWORD` trong `.env`. Đăng nhập cấp session cookie `httpOnly` ký bằng `ADMIN_SESSION_SECRET` (hạn 7 ngày); sai quá 10 lần / 15 phút thì khoá đăng nhập tạm thời.
- Supabase chỉ dùng ở server làm database. Secret key (`SUPABASE_SERVICE_ROLE_KEY`) không bao giờ đặt vào biến `VITE_*`.
- Không đọc / ghi `.env*`.
- SVG upload luôn đi qua pipeline sanitize trước khi lưu (từ Phase 1).

## 🧪 Testing
- Test trong `tests/`, đúng đường dẫn tương ứng `src/`, import bằng alias `@/…`.
- Route test qua `createTestApp()` (`tests/server/testApp.ts`) — không cần Supabase thật.
- Sửa logic → thêm/cập nhật test. Không xoá assertion cũ để cho pass.
- Trước khi báo xong: `npm run build && npm test && npm run lint`.

## 🧠 Core Principles
- Simple, readable, maintainable. Một module, một việc. Giải đúng vấn đề, không hơn.
- Thay đổi lớn (đổi schema, đổi route public, đổi luồng đăng nhập): nêu kế hoạch và hỏi trước; commit mốc rollback trước khi làm.
