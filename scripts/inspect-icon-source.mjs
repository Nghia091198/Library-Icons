import { existsSync, readFileSync, statSync } from 'node:fs';

const SOURCE_ROOT = 'C:/Users/admin/OneDrive/Documents/ChatGPT/Other';
const MANIFEST_PATH = `${SOURCE_ROOT}/nghia-icon-manifest.json`;
const ZIP_CANDIDATES = [`${SOURCE_ROOT}/nghia-icon-all.zip`, 'C:/Users/admin/Downloads/NGHIA - ICON (1).zip'];
const SAMPLE_SIZE = 8;

for (const path of ZIP_CANDIDATES) {
  console.log(`zip ${path}: ${existsSync(path) ? `${statSync(path).size} bytes` : 'không có'}`);
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
console.log('manifest keys:', Object.keys(manifest));
const icons = manifest.icons ?? [];
console.log('số icon:', icons.length);
console.log('các trường của một icon:', Object.keys(icons[0] ?? {}));
console.log('mẫu:', JSON.stringify(icons.slice(0, SAMPLE_SIZE), null, 1).slice(0, 3000));

const countBy = (pick) => {
  const counts = new Map();
  for (const icon of icons) {
    const key = pick(icon);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts).sort((a, b) => b[1] - a[1]);
};

const path = (icon) => (Array.isArray(icon.full_path) ? icon.full_path : []);
console.log('cấp 1 của full_path:', countBy((icon) => path(icon)[0] ?? '(none)').slice(0, 30));
console.log('cấp 2 của full_path:', countBy((icon) => path(icon).slice(0, 2).join(' / ')).slice(0, 40));
console.log('tên lá hay gặp:', countBy((icon) => path(icon).at(-1) ?? '(none)').slice(0, 30));
