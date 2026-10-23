// Thử MCP như một agent: kết nối → liệt kê công cụ → chọn bộ → tìm icon cho header → lấy SVG.
// Mặc định gọi server ở máy; đặt MCP_URL để thử bản deploy, ví dụ https://library-icons.vercel.app/api/mcp
const MCP_URL = process.env.MCP_URL ?? 'http://localhost:8787/api/mcp';
const PROTOCOL_VERSION = '2025-06-18';
let nextId = 1;

async function rpc(method, params = {}) {
  const started = performance.now();
  const response = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'mcp-protocol-version': PROTOCOL_VERSION,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
  });
  const body = await response.json();
  const elapsed = Math.round(performance.now() - started);
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
  return { result: body.result, elapsed };
}

async function callTool(name, args = {}) {
  const { result, elapsed } = await rpc('tools/call', { name, arguments: args });
  const text = result.content?.[0]?.text ?? '';
  return { data: result.isError ? text : JSON.parse(text), isError: result.isError === true, elapsed };
}

console.log(`== ${MCP_URL}`);
const init = await rpc('initialize', { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 'check-mcp', version: '1.0.0' } });
console.log(`initialize: ${init.elapsed}ms · ${init.result.serverInfo.name} ${init.result.serverInfo.version}`);

const tools = await rpc('tools/list');
console.log(`tools/list: ${tools.elapsed}ms · ${tools.result.tools.map((tool) => tool.name).join(', ')}`);

const sets = await callTool('list_icon_sets');
console.log(`list_icon_sets: ${sets.elapsed}ms`);
for (const set of sets.data) console.log(`  ${set.slug} (${set.iconCount}): ${set.usage}`);

const headerNeeds = ['search', 'user', 'cart', 'menu', 'heart'];
const chosen = [];
for (const need of headerNeeds) {
  const search = await callTool('search_icons', { query: need, set: 'outline', limit: 3 });
  const slugs = search.data.items.map((item) => item.slug);
  console.log(`search_icons "${need}": ${search.elapsed}ms · ${search.data.total} kết quả · ${slugs.join(', ')}`);
  if (slugs[0]) chosen.push(slugs[0]);
}

const icons = await callTool('get_icons', { set: 'outline', slugs: [...chosen, 'cart-bag'] });
console.log(`get_icons: ${icons.elapsed}ms · nhận ${icons.data.icons.length} SVG · thiếu: ${JSON.stringify(icons.data.missing)}`);
console.log(`  ví dụ ${icons.data.icons[0]?.slug}: ${icons.data.icons[0]?.svg.slice(0, 90)}…`);

const badSet = await callTool('get_icons', { set: 'neon', slugs: ['x'] });
console.log(`Bộ sai → lỗi cho agent: ${badSet.isError} · ${badSet.data}`);
