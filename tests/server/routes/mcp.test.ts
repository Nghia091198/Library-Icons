import { describe, expect, it } from 'vitest';
import { API_ROUTE } from '@/shared/constants/apiRoutes';
import { ICON_STATUS } from '@/shared/constants/icons';
import type { CreateIconsResponse } from '@/shared/types/icons';
import { SEEDED_SET_SLUG } from '../icons/inMemoryIconRepository';
import { createSignedInClient, createTestApp } from '../testApp';

const PROTOCOL_VERSION = '2025-06-18';

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

interface ToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

type TestApp = ReturnType<typeof createTestApp>;

async function rpc(app: TestApp, method: string, params: Record<string, unknown> = {}) {
  const response = await app.request(API_ROUTE.mcp, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'mcp-protocol-version': PROTOCOL_VERSION,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  return { response, body: (await response.json()) as JsonRpcResponse };
}

async function callTool(app: TestApp, name: string, args: Record<string, unknown> = {}) {
  const { body } = await rpc(app, 'tools/call', { name, arguments: args });
  return body.result as unknown as ToolResult;
}

async function setupLibrary() {
  const client = await createSignedInClient();
  const setId = client.iconRepository.setIdBySlug(SEEDED_SET_SLUG.outline);
  const created = (await (
    await client.send('POST', API_ROUTE.adminIcons, {
      status: ICON_STATUS.published,
      items: [
        { source: { text: '<svg viewBox="0 0 24 24"><path d="M3 4h2l2 11h11l2-7H6" stroke="currentColor"/></svg>' }, candidateIndex: 0, setId, slug: 'shopping-cart' },
      ],
    })
  ).json()) as CreateIconsResponse;
  if (!created.results[0]?.ok) throw new Error('Setup failed');
  return client;
}

describe('MCP endpoint', () => {
  it('initializes and introduces itself with usage instructions', async () => {
    const { response, body } = await rpc(createTestApp(), 'initialize', {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' },
    });

    expect(response.status).toBe(200);
    expect(body.result).toMatchObject({ serverInfo: { name: 'lib-icons' } });
    expect(String(body.result?.instructions)).toMatch(/search_icons/);
  });

  it('lists the four read-only tools', async () => {
    const { body } = await rpc(createTestApp(), 'tools/list');
    const tools = (body.result?.tools ?? []) as Array<{ name: string; annotations?: { readOnlyHint?: boolean } }>;

    expect(tools.map((tool) => tool.name).sort()).toEqual(['get_icons', 'list_icon_categories', 'list_icon_sets', 'search_icons']);
    expect(tools.every((tool) => tool.annotations?.readOnlyHint === true)).toBe(true);
  });

  it('searches and fetches icons through tool calls', async () => {
    const { app } = await setupLibrary();
    const search = await callTool(app, 'search_icons', { query: 'cart', set: 'outline' });
    const fetched = await callTool(app, 'get_icons', { set: 'outline', slugs: ['shopping-cart'] });

    expect(JSON.parse(search.content[0]?.text ?? '{}')).toMatchObject({ total: 1, items: [{ slug: 'shopping-cart', set: 'outline' }] });
    expect(JSON.parse(fetched.content[0]?.text ?? '{}')).toMatchObject({ icons: [{ slug: 'shopping-cart', svg: expect.stringMatching(/^<svg/) }] });
  });

  it('reports bad input as a tool error the agent can act on', async () => {
    const result = await callTool(createTestApp(), 'get_icons', { set: 'neon', slugs: ['x'] });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/Unknown set "neon".*outline/);
  });

  it('serves the conventions document as a resource', async () => {
    const { body } = await rpc(createTestApp(), 'resources/read', { uri: 'lib-icons://conventions' });
    const contents = (body.result?.contents ?? []) as Array<{ mimeType: string; text: string }>;

    expect(contents[0]?.mimeType).toBe('text/markdown');
    expect(contents[0]?.text).toMatch(/currentColor/);
  });

  it('allows browser clients through CORS preflight', async () => {
    const response = await createTestApp().request(API_ROUTE.mcp, {
      method: 'OPTIONS',
      headers: { origin: 'https://inspector.example', 'access-control-request-method': 'POST' },
    });

    expect(response.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('shares the public rate limit', async () => {
    const app = createTestApp({ publicRateLimiter: { allow: () => false } });
    const response = await app.request(API_ROUTE.mcp, { method: 'POST', body: '{}' });

    expect(response.status).toBe(429);
  });
});
