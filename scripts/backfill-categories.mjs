import { spawnSync } from 'node:child_process';

const result = spawnSync(
  process.execPath,
  ['--env-file=.env', '--import', 'tsx', 'src/server/cli/backfillCategories.ts'],
  { stdio: 'inherit' },
);
process.exitCode = result.status ?? 1;
