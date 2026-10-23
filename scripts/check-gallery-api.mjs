const BASE = 'http://localhost:8787/api/v1/icons';
const CHECKS = [
  { label: 'All Icons, trang 1', url: `${BASE}?pageSize=8` },
  { label: 'All Icons, trang 2', url: `${BASE}?pageSize=8&page=2` },
  { label: 'Tìm "arrow down"', url: `${BASE}?pageSize=5&q=${encodeURIComponent('arrow down')}` },
  { label: 'Nhóm Chevrons', url: `${BASE}?pageSize=5&categorySlug=chevrons` },
];

for (const check of CHECKS) {
  const started = performance.now();
  const response = await fetch(check.url);
  const elapsed = Math.round(performance.now() - started);
  const body = await response.json();
  const slugs = (body.items ?? []).map((icon) => icon.slug).join(', ');
  console.log(`${check.label}: HTTP ${response.status} · ${elapsed}ms · tổng ${body.total} · ${slugs}`);
  console.log(`  cache-control: ${response.headers.get('cache-control')}`);
}
