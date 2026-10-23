import { existsSync, readFileSync } from 'node:fs';

const LOG_FILES = ['reclassify-brand-apply.log', 'publish-all.log'];
const TAIL_LINES = 8;

for (const file of LOG_FILES) {
  if (!existsSync(file)) {
    console.log(`== ${file}: chưa có`);
    continue;
  }
  const lines = readFileSync(file, 'utf8').trimEnd().split('\n');
  console.log(`== ${file} (${lines.length} dòng)`);
  console.log(lines.slice(-TAIL_LINES).join('\n') || '(trống)');
}
