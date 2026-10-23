import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { MCP_CONVENTIONS_MARKDOWN, MCP_CONVENTIONS_URI } from '@/server/mcp/conventions';
import { MCP_GET_ICONS_MAX, MCP_SEARCH_LIMIT, McpCatalogError, type IconCatalog } from '@/server/mcp/iconCatalog';

export const MCP_SERVER_INFO = { name: 'lib-icons', version: '1.0.0' } as const;

// Văn bản client nhận ngay khi kết nối; viết cho AI đọc nên dùng tiếng Anh và đi thẳng vào quy trình.
const SERVER_INSTRUCTIONS = `Lib Icons: a curated library of clean, 24×24 SVG icons for web and Haravan themes.
Workflow: list_icon_sets to choose ONE style (default "outline") → search_icons with short English keywords → get_icons once with all chosen slugs.
Never invent slugs; use search results or the suggestions returned for missing slugs. Read ${MCP_CONVENTIONS_URI} for usage rules.`;

const READ_ONLY = { readOnlyHint: true, idempotentHint: true, openWorldHint: false } as const;

function jsonResult(data: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
}

// Lỗi do đầu vào (bộ không tồn tại, quá nhiều slug) trả về cho AI dưới dạng kết quả lỗi để nó tự sửa;
// lỗi hệ thống thì để SDK xử lý như lỗi giao thức.
async function runTool(work: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    return jsonResult(await work());
  } catch (error) {
    if (error instanceof McpCatalogError) return { content: [{ type: 'text', text: error.message }], isError: true };
    throw error;
  }
}

export function createIconMcpServer(catalog: IconCatalog): McpServer {
  const server = new McpServer(MCP_SERVER_INFO, { instructions: SERVER_INSTRUCTIONS });

  server.registerTool(
    'list_icon_sets',
    {
      title: 'List icon sets',
      description:
        'List the icon sets (drawing styles) with their icon counts and when to use each. Pick one set per UI and use it consistently.',
      annotations: READ_ONLY,
    },
    () => runTool(() => catalog.listSets()),
  );

  server.registerTool(
    'list_icon_categories',
    {
      title: 'List icon categories',
      description: 'List icon categories (topics such as arrows, commerce, users) with icon counts. Use a category slug to narrow search_icons.',
      annotations: READ_ONLY,
    },
    () => runTool(() => catalog.listCategories()),
  );

  server.registerTool(
    'search_icons',
    {
      title: 'Search icons',
      description:
        'Search published icons by English keyword, optionally within a set and/or category. Returns slugs, names and tags without SVG; use get_icons to fetch the markup.',
      inputSchema: {
        query: z.string().max(100).optional().describe('Short English keyword, e.g. "cart", "arrow down", "user".'),
        set: z.string().max(80).optional().describe('Set slug from list_icon_sets, e.g. "outline".'),
        category: z.string().max(80).optional().describe('Category slug from list_icon_categories, e.g. "commerce".'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(MCP_SEARCH_LIMIT.max)
          .optional()
          .describe(`Maximum results (default ${MCP_SEARCH_LIMIT.default}).`),
      },
      annotations: READ_ONLY,
    },
    (args) => runTool(() => catalog.searchIcons(args)),
  );

  server.registerTool(
    'get_icons',
    {
      title: 'Get icons',
      description: `Get the SVG markup of up to ${MCP_GET_ICONS_MAX} icons from one set in a single call. Slugs that do not exist are listed under "missing" with suggestions.`,
      inputSchema: {
        set: z.string().max(80).describe('Set slug, e.g. "outline". All requested icons come from this set.'),
        slugs: z
          .array(z.string().max(120))
          .min(1)
          .max(MCP_GET_ICONS_MAX)
          .describe('Icon slugs from search_icons, e.g. ["shopping-cart", "search", "user"].'),
      },
      annotations: READ_ONLY,
    },
    (args) => runTool(() => catalog.getIcons(args.set, args.slugs)),
  );

  server.registerResource(
    'conventions',
    MCP_CONVENTIONS_URI,
    {
      title: 'Lib Icons conventions',
      description: 'How icons are normalized, how sets differ from categories, and how to use icons in Haravan (Liquid) themes.',
      mimeType: 'text/markdown',
    },
    (uri) => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: MCP_CONVENTIONS_MARKDOWN }] }),
  );

  return server;
}
