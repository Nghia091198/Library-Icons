import { runCliInBackground } from './runCliInBackground.mjs';

runCliInBackground(
  'src/server/cli/recategorizeArchived.ts',
  ['--source', 'C:/Users/admin/OneDrive/Documents/ChatGPT/Other'],
  'recategorize-archived.log',
);
