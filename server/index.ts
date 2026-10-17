import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import express from 'express';
import { createApp } from './app';
process.umask(0o077);
const dataDir = resolve(process.env.DATA_DIR ?? '.data');
const { app, store } = createApp({ dataDir, secureCookies: process.env.COOKIE_SECURE === 'true' });
if (process.env.NODE_ENV === 'production') {
  if (!existsSync('dist/index.html')) throw new Error('Run npm run build first.');
  app.use(express.static(resolve('dist')));
  app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT ?? 3000);
const server = app.listen(port, process.env.HOST ?? '0.0.0.0', () => {
  console.log(`Travel Planner listening on port ${port}. Storage: ${dataDir}`);
  if (store.setupRequired())
    console.log(
      `First-run setup code is stored privately at ${dataDir}/setup-code.txt. Enter it in the setup screen. No public demo credentials exist.`,
    );
});
process.on('SIGTERM', () =>
  server.close(() => {
    store.db.close();
    process.exit(0);
  }),
);
