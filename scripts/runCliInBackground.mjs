import { spawn } from 'node:child_process';
import { openSync } from 'node:fs';

// Chạy một CLI TypeScript ở nền (tách khỏi tiến trình gọi) và ghi toàn bộ output ra file log.
export function runCliInBackground(entry, args, logFile) {
  const log = openSync(logFile, 'w');
  const child = spawn(process.execPath, ['--env-file=.env', '--import', 'tsx', entry, ...args], {
    detached: true,
    stdio: ['ignore', log, log],
    windowsHide: true,
  });
  child.unref();
  console.log(`Đã chạy nền (pid ${child.pid}). Theo dõi trong ${logFile}.`);
}
