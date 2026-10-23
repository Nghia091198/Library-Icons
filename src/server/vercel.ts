import { handle } from '@hono/node-server/vercel';
import { createProductionApp } from '@/server/createProductionApp';

// Vercel cung cấp biến môi trường qua process.env; giao diện tĩnh do CDN của Vercel phục vụ.
const { app } = createProductionApp(process.env);

export default handle(app);
