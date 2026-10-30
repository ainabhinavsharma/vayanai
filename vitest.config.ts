import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 15000,
    include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)', 'tests/email-smoke.ts']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
});
