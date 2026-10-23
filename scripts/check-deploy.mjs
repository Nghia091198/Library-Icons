// Kiểm tra bản deploy từ xa: API, dữ liệu, cache CDN, định tuyến SPA và thời gian phản hồi.
const BASE = process.env.DEPLOY_URL ?? 'https://library-icons.vercel.app';

async function timed(path, init) {
  const started = performance.now();
  const response = await fetch(`${BASE}${path}`, init);
  const elapsed = Math.round(performance.now() - started);
  return { response, elapsed };
}

function cacheInfo(response) {
  return `cache-control="${response.headers.get('cache-control')}" · x-vercel-cache=${response.headers.get('x-vercel-cache') ?? '—'}`;
}

console.log(`== ${BASE}`);

const health = await timed('/api/v1/health');
console.log(`health: HTTP ${health.response.status} · ${health.elapsed}ms · ${await health.response.text()}`);

for (const [label, path] of [
  ['All Icons trang 1', '/api/v1/icons?pageSize=6'],
  ['All Icons trang 2', '/api/v1/icons?pageSize=6&page=2'],
  ['Tìm "arrow down"', `/api/v1/icons?pageSize=4&q=${encodeURIComponent('arrow down')}`],
  ['Nhóm Chevrons', '/api/v1/icons?pageSize=4&categorySlug=chevrons'],
]) {
  const { response, elapsed } = await timed(path);
  const body = await response.json();
  console.log(`${label}: HTTP ${response.status} · ${elapsed}ms · tổng ${body.total} · ${body.items.map((icon) => icon.slug).join(', ')}`);
}

const firstHit = await timed('/api/v1/icon-categories');
await firstHit.response.arrayBuffer();
const secondHit = await timed('/api/v1/icon-categories');
await secondHit.response.arrayBuffer();
console.log(`API nhóm, lần 1: ${firstHit.elapsed}ms · ${cacheInfo(firstHit.response)}`);
console.log(`API nhóm, lần 2: ${secondHit.elapsed}ms · ${cacheInfo(secondHit.response)}`);

const home = await timed('/');
const html = await home.response.text();
const assetPath = /\/assets\/[^"']+\.js/.exec(html)?.[0];
if (assetPath) {
  const asset = await timed(assetPath);
  await asset.response.arrayBuffer();
  console.log(`File tĩnh ${assetPath}: HTTP ${asset.response.status} · ${asset.elapsed}ms · ${cacheInfo(asset.response)}`);
}

for (const path of ['/arrows', '/guide', '/admin/login', '/admin/icons']) {
  const { response, elapsed } = await timed(path);
  const text = await response.text();
  const isApp = text.includes('<div id="root">');
  console.log(`Tải lại ${path}: HTTP ${response.status} · ${elapsed}ms · ${isApp ? 'trả về app' : 'KHÔNG phải app'}`);
}

const admin = await timed('/api/admin/me');
console.log(`Admin chưa đăng nhập: HTTP ${admin.response.status} (mong đợi 401)`);
