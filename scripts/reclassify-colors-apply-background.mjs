import { runCliInBackground } from './runCliInBackground.mjs';

runCliInBackground('src/server/cli/reclassifyColorIcons.ts', ['--apply'], 'reclassify-colors-apply.log');
