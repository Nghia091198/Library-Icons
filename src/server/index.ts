import { serve } from '@hono/node-server';
import { registerClientAssets } from '@/server/clientAssets';
import { createProductionApp } from '@/server/createProductionApp';

const { app, config, logger } = createProductionApp(process.env);
registerClientAssets(app);

serve({ fetch: app.fetch, port: config.port }, (info) => {
  logger.info({ port: info.port }, 'API server started');
});
