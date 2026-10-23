import { serveStatic } from '@hono/node-server/serve-static';
import type { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '@/server/appEnv';
import { isApiPath } from '@/shared/constants/apiRoutes';

// Đường dẫn tính từ thư mục chạy `npm start` (gốc project), khớp build.outDir trong vite.config.ts.
const CLIENT_DIST_DIR = './dist/client';
const CLIENT_ENTRY_FILE = `${CLIENT_DIST_DIR}/index.html`;

export function registerClientAssets(app: OpenAPIHono<AppEnv>): void {
  const serveAsset = serveStatic({ root: CLIENT_DIST_DIR });
  const serveSpaEntry = serveStatic({ path: CLIENT_ENTRY_FILE });

  app.get('*', async (c, next) => {
    if (isApiPath(c.req.path)) return next();
    return serveAsset(c, () => serveSpaEntry(c, next).then(() => undefined));
  });
}
