#!/usr/bin/env tsx
// @nx-target-name: serve
import { createConfiguredApp } from './container';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const app = createConfiguredApp();

const server = app.listen(port, host, async (error?: Error) => {
  if (error) {
    throw error;
  }
  console.log(`[ ready ] http://${host}:${port}`);
  // Set when Nx waits for this server to be ready
  if (process.env.NX_READY_SIGNAL_SOCKET) {
    try {
      // Function keeps TypeScript and bundlers from rewriting or bundling the import
      const load = new Function('s', 'return import(s)') as (
        s: string,
      ) => Promise<{ emitReadySignal(server: unknown): boolean }>;
      (await load('@nx/js/ready-signal')).emitReadySignal(server);
    } catch {
      // @nx/js isn't installed
    }
  }
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
