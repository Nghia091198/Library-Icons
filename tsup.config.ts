import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/server/index.ts',
    vercel: 'src/server/vercel.ts',
  },
  outDir: 'dist/server',
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  clean: true,
});
