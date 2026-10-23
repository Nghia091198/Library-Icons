import { readFileSync } from 'node:fs';

const MANIFEST_PATH = 'C:/Users/admin/OneDrive/Documents/ChatGPT/Other/nghia-icon-manifest.json';
const ARCHIVED_GROUP = 'Archived';
const TOP = 60;

const { icons } = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const archived = icons.filter((icon) => icon.full_path?.[1] === ARCHIVED_GROUP);

const countBy = (pick) => {
  const counts = new Map();
  for (const icon of archived) {
    const key = pick(icon);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts).sort((first, second) => second[1] - first[1]);
};

console.log(`Archived: ${archived.length}`);
console.log('Độ sâu full_path:', countBy((icon) => icon.full_path.length));
console.log('Cấp 3 (full_path[2]):', countBy((icon) => icon.full_path[2] ?? '(none)').slice(0, TOP));
console.log('Cấp 4 (full_path[3]):', countBy((icon) => icon.full_path[3] ?? '(none)').slice(0, 20));
console.log('Trường category:', countBy((icon) => String(icon.category ?? '(none)')).slice(0, TOP));
console.log('Ví dụ:', archived.slice(0, 5).map((icon) => ({ path: icon.full_path, name: icon.icon_name, category: icon.category })));
