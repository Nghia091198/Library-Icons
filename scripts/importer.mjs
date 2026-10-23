import { spawnSync } from 'node:child_process';

export const IMPORT_SAMPLE_ARGS = [
  '--source', 'C:/Users/admin/OneDrive/Documents/ChatGPT/Other',
  '--groups', 'Commerce,Arrow,General,Communication,Social icon',
  '--per-group', '40',
  '--limit', '200',
];

export function runImporter({ apply }) {
  const nodeFlags = apply ? ['--env-file=.env', '--import', 'tsx'] : ['--import', 'tsx'];
  const args = [...nodeFlags, 'src/server/cli/importFigmaIcons.ts', ...IMPORT_SAMPLE_ARGS, ...(apply ? ['--apply'] : [])];
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
}
