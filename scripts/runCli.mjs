import { spawnSync } from 'node:child_process';

export function runCli(entry, args = []) {
  const result = spawnSync(process.execPath, ['--env-file=.env', '--import', 'tsx', entry, ...args], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
}
