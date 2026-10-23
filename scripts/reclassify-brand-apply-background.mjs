import { runCliInBackground } from './runCliInBackground.mjs';

runCliInBackground('src/server/cli/reclassifyColorIcons.ts', ['--set', 'brand', '--apply'], 'reclassify-brand-apply.log');
