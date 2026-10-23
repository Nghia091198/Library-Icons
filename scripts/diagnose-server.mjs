import { spawn } from 'node:child_process';

const OBSERVE_MS = 5000;
const SERVER_ENTRY = 'src/server/index.ts';

const child = spawn(process.execPath, ['--env-file=.env', '--import', 'tsx', SERVER_ENTRY], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
child.stdout.on('data', (chunk) => (output += chunk));
child.stderr.on('data', (chunk) => (output += chunk));

const exited = new Promise((resolve) => child.on('exit', (code, signal) => resolve({ code, signal })));
const timedOut = new Promise((resolve) => setTimeout(() => resolve(null), OBSERVE_MS));

const result = await Promise.race([exited, timedOut]);
if (result === null) {
  console.log(`Server vẫn đang chạy sau ${OBSERVE_MS / 1000}s — tắt process thử nghiệm.`);
  child.kill();
} else {
  console.log(`Server thoát: code=${result.code} signal=${result.signal}`);
}

console.log('--- output ---');
console.log(output.trim() || '(không có output)');
