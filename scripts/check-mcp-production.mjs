// Chạy check-mcp tới bản chính thức trên Vercel.
process.env.MCP_URL = 'https://library-icons.vercel.app/api/mcp';
await import('./check-mcp.mjs');
