import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { rawTextPlugin } from '../../build/raw-text-plugin.mjs';

const appRoot = import.meta.dirname;

export default defineConfig({
  plugins: [rawTextPlugin()],
  resolve: {
    alias: {
      '@': resolve(appRoot, 'src'),
      '@moonshot-ai/agent-core': fileURLToPath(new URL('../../packages/agent-core/src/index.ts', import.meta.url)),
    },
  },
  test: {
    name: 'cli',
    env: {
      KIMI_LOG_LEVEL: 'off',
    },
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
  },
});
