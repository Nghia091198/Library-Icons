import { execFileSync } from 'node:child_process';

// Cho biết tiến trình nào đang giữ cổng server dev (chỉ đọc, không tắt gì). Dùng lệnh có sẵn của Windows.
const PORT = 8787;

const netstat = execFileSync('netstat', ['-ano', '-p', 'tcp'], { encoding: 'utf8' });
const listeners = netstat
  .split('\n')
  .filter((line) => line.includes(`:${PORT} `) && line.includes('LISTENING'))
  .map((line) => line.trim().split(/\s+/).at(-1))
  .filter(Boolean);

const pids = [...new Set(listeners)];
if (pids.length === 0) {
  console.log(`Không có tiến trình nào đang nghe cổng ${PORT}.`);
} else {
  for (const pid of pids) {
    const detail = execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}' | Select-Object ProcessId, CreationDate, CommandLine | Format-List`,
      ],
      { encoding: 'utf8' },
    );
    console.log(`Cổng ${PORT} đang do PID ${pid} giữ:`);
    console.log(detail.trim());
  }
}
