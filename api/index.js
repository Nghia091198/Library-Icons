// Hàm serverless của Vercel. Server thật được build sẵn (tsup) vào dist/server/vercel.js
// vì trình build hàm của Vercel không hiểu alias "@/" trong tsconfig.
export { default } from '../dist/server/vercel.js';

// Hono tự đọc body; tắt bộ đọc body của Vercel để không bị đọc trước.
export const config = { api: { bodyParser: false } };
