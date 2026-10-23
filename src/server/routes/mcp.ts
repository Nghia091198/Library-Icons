import type { OpenAPIHono } from '@hono/zod-openapi';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { MiddlewareHandler } from 'hono';
import { cors } from 'hono/cors';
import type { AppEnv } from '@/server/appEnv';
import type { IconCatalog } from '@/server/mcp/iconCatalog';
import { createIconMcpServer } from '@/server/mcp/mcpServer';
import { API_ROUTE } from '@/shared/constants/apiRoutes';

// Header của giao thức MCP mà client trên trình duyệt cần gửi và đọc được.
const MCP_CORS = cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['content-type', 'accept', 'authorization', 'mcp-protocol-version', 'mcp-session-id', 'last-event-id'],
  exposeHeaders: ['mcp-session-id', 'mcp-protocol-version'],
});

// Không giữ trạng thái và trả JSON thay vì SSE: mỗi request là một lần gọi hàm serverless độc lập (Vercel).
// CORS đứng trước giới hạn request để cả phản hồi 429 cũng đọc được từ client trên trình duyệt.
export function registerMcpRoute(
  app: OpenAPIHono<AppEnv>,
  catalog: IconCatalog,
  rateLimit: MiddlewareHandler<AppEnv>,
): void {
  app.use(API_ROUTE.mcp, MCP_CORS);
  app.use(API_ROUTE.mcp, rateLimit);
  app.all(API_ROUTE.mcp, async (c) => {
    const server = createIconMcpServer(catalog);
    const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
    await server.connect(transport);
    try {
      return await transport.handleRequest(c.req.raw);
    } finally {
      await server.close();
    }
  });
}
