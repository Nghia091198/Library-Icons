# Lib Icons MCP

Server [MCP (Model Context Protocol)](https://modelcontextprotocol.io) cho phép các AI agent (Claude Code, Codex, Cursor, Copilot…) tìm và lấy icon từ thư viện Lib Icons: hơn 11.000 icon SVG đã làm sạch, chuẩn hoá trên lưới 24×24, dùng ngay được trong theme Haravan, web hay React.

| | |
|---|---|
| **Địa chỉ** | `https://library-icons.vercel.app/api/mcp` |
| **Kiểu kết nối** | HTTP (Streamable HTTP), không giữ phiên |
| **Xác thực** | Không cần: chỉ đọc, chỉ trả icon đã publish |
| **Giới hạn** | 600 request/phút mỗi IP, dùng chung với API công khai |

> Mở địa chỉ này bằng trình duyệt sẽ thấy lỗi `Not Acceptable: Client must accept text/event-stream`. Đó là **bình thường**: endpoint chỉ trả lời client MCP (gửi `POST` JSON-RPC), không phục vụ trang web. Cách kiểm tra đúng xem mục [Kiểm tra kết nối](#kiểm-tra-kết-nối).

---

## Cài đặt

Mọi công cụ đều dùng cùng một địa chỉ; chỉ khác cách khai báo. Định dạng cấu hình của các công cụ thay đổi theo phiên bản, nên nếu một cách không chạy, xem tài liệu MCP mới nhất của công cụ đó hoặc dùng [cách dự phòng](#cách-dự-phòng-cho-mọi-công-cụ).

### Claude Code

```bash
claude mcp add --transport http lib-icons https://library-icons.vercel.app/api/mcp
```

Hoặc commit file `.mcp.json` ở thư mục gốc repo để mọi người trong nhóm dùng chung:

```json
{
  "mcpServers": {
    "lib-icons": {
      "type": "http",
      "url": "https://library-icons.vercel.app/api/mcp"
    }
  }
}
```

### Codex (OpenAI)

File `~/.codex/config.toml`:

```toml
[mcp_servers.lib-icons]
url = "https://library-icons.vercel.app/api/mcp"
```

Phiên bản Codex cũ chỉ hỗ trợ MCP chạy cục bộ: dùng cách dự phòng.

### Cursor

File `.cursor/mcp.json` trong project (hoặc `~/.cursor/mcp.json` cho mọi project):

```json
{
  "mcpServers": {
    "lib-icons": { "url": "https://library-icons.vercel.app/api/mcp" }
  }
}
```

### VS Code (GitHub Copilot)

File `.vscode/mcp.json` trong project:

```json
{
  "servers": {
    "lib-icons": { "type": "http", "url": "https://library-icons.vercel.app/api/mcp" }
  }
}
```

### Windsurf

File `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "lib-icons": { "serverUrl": "https://library-icons.vercel.app/api/mcp" }
  }
}
```

### Gemini CLI

File `.gemini/settings.json`:

```json
{
  "mcpServers": {
    "lib-icons": { "httpUrl": "https://library-icons.vercel.app/api/mcp" }
  }
}
```

### Claude Desktop / claude.ai

Trong cài đặt **Connectors**, thêm connector tuỳ chỉnh với địa chỉ ở trên. Vị trí menu và gói được dùng connector tuỳ chỉnh có thể thay đổi; xem https://support.claude.com.

### Cách dự phòng cho mọi công cụ

Công cụ chỉ chạy được MCP cục bộ (stdio) thì dùng cầu nối [`mcp-remote`](https://www.npmjs.com/package/mcp-remote). Cần Node.js trên máy:

```json
{
  "mcpServers": {
    "lib-icons": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://library-icons.vercel.app/api/mcp"]
    }
  }
}
```

### Khuyến nghị cho repo dùng icon (ví dụ lib tạo theme)

1. Commit sẵn file cấu hình cho các công cụ nhóm đang dùng (`.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json`…).
2. Thêm vào `CLAUDE.md` / `AGENTS.md` của repo một dòng để agent biết khi nào dùng:

   > Khi cần icon, luôn lấy từ MCP `lib-icons` (`search_icons` → `get_icons`). Không tự vẽ SVG, không bịa slug.

---

## Kiểm tra kết nối

| Cách | Làm gì | Thành công khi |
|---|---|---|
| Claude Code | `claude mcp list`, hoặc gõ `/mcp` trong phiên | `lib-icons` hiện **Connected** và 4 công cụ |
| MCP Inspector | `npx @modelcontextprotocol/inspector` → *Streamable HTTP* → dán địa chỉ → **Connect** | Tab **Tools** hiện 4 công cụ, gọi thử `search_icons` có kết quả |
| Hỏi AI | *"Dùng lib-icons tìm icon giỏ hàng bộ outline"* | AI gọi `search_icons` và trả về `shopping-cart` |
| Script trong repo này | `node scripts/check-mcp-production.mjs` | In ra kết quả từng bước của một agent dựng header |

---

## Công cụ (tools)

Cả 4 công cụ đều **chỉ đọc**; gọi lặp lại không thay đổi gì. Kết quả trả về dạng JSON trong nội dung văn bản của tool result.

### `list_icon_sets`

Liệt kê các bộ (kiểu vẽ), số icon và khi nào nên dùng. **Chọn một bộ cho cả giao diện và dùng nhất quán.**

```json
[
  { "slug": "outline", "name": "Outline", "style": "outline", "iconCount": 2006,
    "usage": "Thin strokes. Default choice for headers, menus, buttons and minimal modern UIs." },
  { "slug": "multicolor", "name": "Multi Color", "style": "multicolor", "iconCount": 621,
    "usage": "Keeps original colors (colored logos, flags, payment methods). Do not recolor with CSS." }
]
```

| Bộ | Dùng cho |
|---|---|
| `outline` | **Mặc định**: header, menu, nút, giao diện tối giản |
| `solid` | Trạng thái đang chọn, tab bar, nút chính |
| `round`, `sharp` | Khối bo tròn (mềm mại) / góc vuông (kỹ thuật) |
| `two-tone` | Khối kèm lớp mờ cùng màu, mang tính trang trí |
| `brand` | Logo đơn sắc, đổi màu theo chữ (mạng xã hội ở footer) |
| `multicolor` | Giữ màu gốc: logo màu, cờ, phương thức thanh toán |

### `list_icon_categories`

Liệt kê nhóm chủ đề có icon (arrows, commerce, users, media…) kèm số lượng. Dùng slug nhóm để thu hẹp `search_icons`.

### `search_icons`

Tìm icon theo từ khoá tiếng Anh. **Không trả SVG**, nên kết quả gọn và rẻ token.

| Tham số | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `query` | string | | Từ khoá ngắn: `"cart"`, `"arrow down"`, `"user"` |
| `set` | string | | Slug bộ, ví dụ `"outline"` |
| `category` | string | | Slug nhóm, ví dụ `"commerce"` |
| `limit` | number | | 1–50, mặc định 20 |

Kết quả **xếp theo mức độ liên quan** (khớp nguyên tên → bắt đầu bằng từ khoá → chứa từ khoá như một từ) và **hiểu từ đồng nghĩa** phổ biến: `user` → `person`, `heart` → `favorite`, `cart` → `shopping-cart`, `trash` → `delete`, `truck` → `local-shipping`…

```json
{
  "total": 18,
  "items": [
    { "slug": "person", "name": "Person", "set": "outline", "category": "users", "tags": ["Archived", "Social"] },
    { "slug": "account-circle", "name": "Account circle", "set": "outline", "category": "users", "tags": [] }
  ]
}
```

### `get_icons`

Lấy mã SVG của tối đa **30 icon trong cùng một bộ** trong một lần gọi.

| Tham số | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `set` | string | ✓ | Slug bộ; mọi icon lấy từ bộ này |
| `slugs` | string[] | ✓ | 1–30 slug lấy từ `search_icons` |

Slug không tồn tại được liệt kê trong `missing` **kèm gợi ý**, để agent tự sửa thay vì bịa tên:

```json
{
  "set": "outline",
  "icons": [
    { "slug": "shopping-cart", "name": "Shopping cart", "set": "outline", "category": "commerce",
      "tags": [], "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" …>…</svg>",
      "keepsOriginalColors": false }
  ],
  "missing": [
    { "slug": "cart-bag", "suggestions": ["shopping-cart", "shopping-cart-checkout", "add-shopping-cart"] }
  ]
}
```

### Lỗi

Đầu vào sai (bộ không tồn tại, quá 30 slug, danh sách rỗng) trả về tool result có `isError: true` và thông báo hướng dẫn cách sửa, ví dụ:

```
Unknown set "neon". Available sets: outline, solid, brand, multicolor, round, sharp, two-tone.
```

## Tài nguyên (resources)

| URI | Nội dung |
|---|---|
| `lib-icons://conventions` | Quy ước icon (lưới 24, `currentColor`, bộ khác nhóm), quy trình nên dùng, cách đưa icon vào theme Haravan |

Ngoài ra server gửi kèm **hướng dẫn chung** (`instructions`) ngay khi kết nối, tóm tắt quy trình cho agent.

---

## Quy trình mẫu: dựng header theme Haravan

```
1. list_icon_sets                          → chọn "outline"
2. search_icons { query: "search", set: "outline", limit: 3 }   → search
   search_icons { query: "user",   set: "outline", limit: 3 }   → person
   search_icons { query: "cart",   set: "outline", limit: 3 }   → shopping-cart
   search_icons { query: "menu",   set: "outline", limit: 3 }   → menu
3. get_icons { set: "outline", slugs: ["search", "person", "shopping-cart", "menu"] }
4. Lưu mỗi SVG thành snippets/icon-<slug>.liquid, dùng {% include 'icon-<slug>' %}
```

Quy ước khi đưa vào theme:
- Icon trang trí: thêm `class="icon" aria-hidden="true" focusable="false"`, và đặt `aria-label` cho link/nút bao quanh.
- CSS gợi ý: `.icon { width: 1.25em; height: 1.25em; vertical-align: middle; flex-shrink: 0; }`.
- Icon dùng `currentColor` nên đổi màu bằng thuộc tính `color` của phần tử cha. **Ngoại lệ:** icon có `keepsOriginalColors: true` giữ màu riêng, không đổi màu bằng CSS.

---

## Xử lý sự cố

| Hiện tượng | Nguyên nhân và cách xử lý |
|---|---|
| Trình duyệt báo `Not Acceptable: Client must accept text/event-stream` | Bình thường; xem lưu ý ở đầu trang |
| Lần gọi đầu mất 1–5 giây | Hàm serverless khởi động lạnh; các lần sau nhanh (khoảng 0,3–0,8 giây) |
| HTTP 429 `TOO_MANY_REQUESTS` | Vượt 600 request/phút; giảm số lần gọi, gom slug vào một lần `get_icons` |
| `Protected deployment` khi gọi bản preview của Vercel | Bản preview bật Deployment Protection; dùng bản chính thức, hoặc xem `scripts/check-mcp-preview.mjs` |
| Công cụ AI báo không hỗ trợ kết nối HTTP | Dùng [cách dự phòng](#cách-dự-phòng-cho-mọi-công-cụ) với `mcp-remote` |
| Tìm không ra icon mong muốn | Thử từ khoá tiếng Anh ngắn hơn, hoặc tên kiểu Material (`person`, `favorite`, `local-shipping`); báo lại để bổ sung từ đồng nghĩa |

---

## Dành cho người phát triển

### Cấu trúc

| File | Vai trò |
|---|---|
| `iconCatalog.ts` | Logic 4 công cụ, **không phụ thuộc SDK MCP**: lọc icon đã publish, đổi id sang slug, gợi ý khi thiếu, cache số icon mỗi bộ 5 phút |
| `mcpServer.ts` | Đăng ký tool, resource và `instructions` với SDK (`@modelcontextprotocol/sdk`) |
| `conventions.ts` | Nội dung resource `lib-icons://conventions` |
| `../routes/mcp.ts` | Gắn endpoint `/api/mcp` vào Hono: CORS → giới hạn request → transport |
| `../icons/iconSearch.ts` | Xếp hạng kết quả và từ đồng nghĩa; dùng chung với ô tìm kiếm của gallery |

### Thiết kế

- **Không giữ trạng thái, trả JSON thay vì SSE** (`WebStandardStreamableHTTPServerTransport` với `enableJsonResponse: true`). Mỗi request tạo server và transport mới rồi đóng lại, phù hợp hàm serverless của Vercel.
- Endpoint nằm dưới `/api` vì Vercel chỉ chuyển `/api/*` vào hàm serverless (xem `vercel.json`).
- CORS mở cho mọi origin, để client chạy trên trình duyệt (MCP Inspector chế độ trực tiếp) gọi được; an toàn vì chỉ đọc dữ liệu công khai.
- Mô tả công cụ, `instructions` và tài liệu quy ước viết bằng **tiếng Anh**, vì người đọc là agent của nhiều hệ khác nhau.

### Hợp đồng ổn định

Các lib khác phụ thuộc vào những điểm sau. **Không đổi nếu chưa thống nhất:**
- Tên 4 công cụ và tên tham số.
- Các trường trong kết quả (`slug`, `set`, `category`, `svg`, `keepsOriginalColors`, `missing[].suggestions`…). Thêm trường mới thì được; đổi tên hoặc xoá thì không.
- URI `lib-icons://conventions` và địa chỉ `/api/mcp`.
- Slug icon đã publish không đổi; đổi tên thì giữ slug cũ làm alias.

### Chạy và kiểm tra ở máy

```bash
npm run dev                                  # server ở http://localhost:8787
node scripts/check-mcp.mjs                   # kịch bản agent tới server ở máy
node scripts/check-mcp-production.mjs        # tới bản chính thức
npx vitest run tests/server/mcp tests/server/routes/mcp.test.ts
```

### Thêm từ đồng nghĩa

Sửa `SEARCH_SYNONYMS` trong `src/server/icons/iconSearch.ts`, thêm test vào `tests/server/icons/iconSearch.test.ts`. Từ đồng nghĩa chỉ áp dụng khi **cả từ khoá** khớp một mục, và kết quả khớp trực tiếp luôn đứng trên kết quả khớp qua từ đồng nghĩa cùng mức.
