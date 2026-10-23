import { spawn } from 'node:child_process';
import { openSync } from 'node:fs';

const LOG_FILE = 'import-all.log';
const SOURCE = 'C:/Users/admin/OneDrive/Documents/ChatGPT/Other';

const log = openSync(LOG_FILE, 'w');
const child = spawn(
  process.execPath,
  [
    '--env-file=.env',
    '--import', 'tsx',
    'src/server/cli/importFigmaIcons.ts',
    '--source', SOURCE,
    '--per-group', '0',
    '--limit', '0',
    '--apply',
  ],
  { detached: true, stdio: ['ignore', log, log], windowsHide: true },
);
child.unref();

console.log(`Đã bắt đầu import nền (pid ${child.pid}). Theo dõi tiến độ trong ${LOG_FILE}.`);
