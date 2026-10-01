import { defineConfig } from 'vitest/config';

// Component / unit tests only (no browser, no network). Run with: npm test
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
